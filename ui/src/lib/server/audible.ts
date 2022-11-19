import { spawn, exec } from 'node:child_process';
import * as DataBase from '$lib/server/db';
import { BookStatus, type AudibleBookData, type LibraryItemBookInfo } from '$lib/types';
import { Exec, Operation } from '$lib/server/utils';
import type { ExecutionResult } from '$lib/server/utils';
import os from 'os';
import path from 'node:path';
import fs from 'node:fs';

const regex =
    /^\s*[a-zA-Z0-9_-]+\.aax:\s*(?<precent>[0-9]+%).+\|\s*(?<downloaded>[0-9\.]+)M\/(?<total>[0-9\.]+)M\s*\[[0-9:<,]+\s(?<speed>[0-9.]+)MB\/s]/;

export type AudibleError = {
    code: number;
    message: string;
};

export const download_test = () => {
    const resultPromise = new Promise((resolve, reject) => {
        let str =
            'All_Systems_Red-LC_64_22050_stereo.aax:  91%|█████████▏| 83.7M/91.6M [00:16<00:01, 5.71MB/s]';
        let m = regex.exec(str);
        // The result can be accessed through the `m`-variable.
        // m?.forEach((match, groupIndex) => {
        //     console.log(`Found match, group ${groupIndex}: ${match}`);
        // });
        resolve(m?.groups);
    });
    return resultPromise;
};

export const download = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        // audible -v error download -a B01N48VJFJ -o ./tmp/ --aax --cover --cover-size 1215 --chapter
        const cmd = spawn('audible', [
            '-v',
            'error',
            'download',
            '-a',
            'B076XSGP65',
            '-o',
            './tmp/',
            '--aax',
            '--cover',
            '--cover-size',
            '1215',
            '--chapter',
        ]);
        var counter = 0;
        var dataStream = '';
        // Alternative syntax using RegExp constructor
        // const regex = new RegExp('(?>[a-zA-Z0-9_-]+\\.aax:)\\s*(?\'Precent\'[0-9]+%).+\\|\\s*(?\'DataDownloaded\'[0-9\\.]+)M\\/(?\'DataTotal\'[0-9\\.]+)M\\s*\\[[0-9:<,]+\\s(?\'Speed\'[0-9.]+MB\\/s)', 'gm')

        cmd.stdout.on('data', function (data) {
            counter++;
            let str = data.toString('utf8'); //.replace(/(\r\n|\n|\r)/gm, "");
            dataStream = dataStream + str;
            console.log('stdout: ' + str);
            // resolve(data.toString('utf8'));
        });

        cmd.stderr.on('data', function (data) {
            let str = data.toString('utf8'); //.replace(/(\r\n|\n|\r)/gm, "");
            // resolve(str);
            // dataStream = dataStream + str;
            let m = regex.exec(str);
            console.log(JSON.stringify(m?.groups));
            // console.log('stderr: ' + str);
        });

        cmd.on('exit', function (code) {
            console.log('------EXIT');
            console.log('exit code: ' + code);
            console.log('Counter: ' + counter);
            console.log('dataStream: ' + dataStream);
            resolve(dataStream);
        });
    });
};

const profile_list = (): Promise<{ name: string; file: string; country: string }[]> => {
    const profile_regex = /\|\s[\*\s]\s\|\s(?<name>[a-zA-Z]+)\s+\|\s(?<file>[a-zA-Z\.]+)\s+\|\s(?<country>[a-zA-Z]{2})\s\|/gm;
    return new Promise(async (resolve, _) => {
        const profileList = new Exec('audible', [
            '--verbosity',
            'ERROR',
            'manage',
            'profile',
            'list',
        ]);
        let profilesRaw = await profileList.execute();
        let response = [];
        let m: any;
        while ((m = profile_regex.exec(profilesRaw.stdout)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) regex.lastIndex++;
            response.push(m?.groups);
        }
        resolve(response);
    });
};

const activation_bytes = async (profile: string): Promise<string> => {
    const audibleCommand = new Exec('audible', [
        '-v',
        'ERROR',
        '-P',
        profile,
        'activation-bytes',
    ]);

    try {
        const result = await audibleCommand.execute();
        return result.stdout.trim();
    } catch (error) {
        const result = error as ExecutionResult;
        throw new Error(result.stdout.trim());
    }
};

// Refresh database with all books that are on Audible
export const sync = async (operation: Operation) => {
    // Get a list of the profiles we have access to
    const profiles = await profile_list();
    const profilePromiseList: Promise<void>[] = [];



    // Loop through each profile and get each of their books
    for (const profile of profiles) profilePromiseList.push(new Promise(async (resolve, _) => {
        // Temp file location for this profile's downloaded JSON
        const tmpFile = path.join(os.tmpdir(), `${profile.name}-${Math.random().toString(36).substr(2, 5)}.json`);

        // Execute the audible command line function to get the JSON
        await new Exec('audible', [
            '-P',
            profile.name,
            'library',
            'export',
            '-f',
            'json',
            '-o',
            tmpFile,
        ]).execute();

        // Create a stream that will read the JSON in one key at a time. This will reduce
        // the memory overhead of loading the entire file in at once
        const rawData = fs.readFileSync(tmpFile, {
            encoding: 'utf8',
        });
        const bookData: AudibleBookData[] = JSON.parse(rawData);
        // For each piece of data within the JSON, assign to the database. This will either
        // update the entry or overwrite it

        const bookList: string[] = [];
        const bookPromiseList: Promise<void>[] = [];

        // Loop through each book in this profile and add it to the database
        for (const book of bookData) bookPromiseList.push(new Promise<void>(async (resolve, _) => {
            // Adjustments to the incoming data
            let narrators: string[] = [];
            if ('narrators' in book) narrators = book.narrators.split(', ');
            else narrators = book.authors.split(', ');

            // Remove duplicates within the list of genres
            let genres = [
                ...new Set(book.genres.split(', ')),
            ] as string[];

            // If this book is already in our library, preserve the status
            let newBook = await DataBase.libraryTable.get({ asin: book.asin });
            let status = BookStatus.Absent;
            if (newBook !== undefined) status = newBook.status;

            // Parse the series number as needed
            let series_number: number | undefined = undefined;
            if (book.series_sequence !== undefined) {
                if (typeof book.series_sequence === 'number') series_number = book.series_sequence;
                else series_number = parseInt(book.series_sequence);

                if (isNaN(series_number)) series_number = undefined;
            }

            // Parse the rating as needed
            let rating: number | undefined = undefined;
            if (book.rating !== undefined) {
                if (typeof book.rating === 'number') rating = book.rating;
                else rating = parseFloat(book.rating);

                if (isNaN(rating)) rating = undefined;
            }

            newBook = {
                asin: book.asin,
                title: book.title,
                subtitle: book.subtitle,
                authors: book.authors.split(', '),
                narrators: narrators,
                series: book.series_title,
                series_number: series_number,
                genres: genres,
                length: book.runtime_length_min,
                rating: rating,
                num_ratings: book.num_ratings,
                release_date: book.release_date,
                image: book.cover_url,
                profile: profile.name,
                status: status,
            };

            bookList.push(book.asin);
            await DataBase.libraryTable.put(newBook);
            console.log('Book Updated', profile.name, book.asin, book.title);

            operation.progress += 100 / profiles.length / bookData.length;
            resolve();
        }));

        // Wait for all of the books to be added before updating the profile information. This is
        // to make sure that the booklist has been written to by each promise
        await Promise.all(bookPromiseList);
        await DataBase.profilesTable.put({
            name: profile.name,
            country: profile.country,
            books: bookList,
            bytes: await activation_bytes(profile.name)
        });
        console.log('Profile Resolved', profile.name);

        // Remove the temp file created earlier
        fs.unlinkSync(tmpFile);

        resolve()
    }));
    return Promise.all(profilePromiseList);
};
