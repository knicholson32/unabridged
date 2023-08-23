import * as child_process from 'node:child_process'; 
import * as fs from 'fs'
import type { Library, BookFromCLI } from '../../types';
import { isLocked } from '../../';
import prisma from '$lib/server/prisma';
import { writeConfigFile } from '$lib/server/cmd/audible/cmd/profile';
import { saveGoogleAPIDetails } from '$lib/server/lookup';
import * as helpers from '$lib/helpers';
import { getAverageColor } from 'fast-average-color-node';

// --------------------------------------------------------------------------------------------
// Library helpers
// --------------------------------------------------------------------------------------------

const fuzzyAuthor = (arr: { name: string }[], str: string) => {
    const con = str.toLocaleLowerCase().replaceAll(' ', '').trim();
    for (const s of arr) if (s.name.toLocaleLowerCase().replaceAll(' ', '').trim() === con) return true
    return false;
}

type Correction = {
    s: string,
    original: string
};

const rectifyAuthors = async (authors: string[]): Promise<string[]> => {
    const corrected: Correction[] = [];
    for (const author of authors) {
        corrected.push({
            s: author.toLocaleLowerCase().replaceAll(' ', '').replaceAll('.', '').trim(),
            original: author
        });
    }

    const dbAuthors = await prisma.author.findMany();
    const authorsSearchable: Correction[] = [];
    for (const author of dbAuthors) {
        authorsSearchable.push({
            s: author.name.toLocaleLowerCase().replaceAll(' ', '').replaceAll('.', '').trim(),
            original: author.name
        });
    }

    const returnAuthors: string[] = [];
    for (const entry of corrected) {
        const match = authorsSearchable.find((a) => a.s === entry.s);
        if (match === undefined) {
            returnAuthors.push(entry.original);
        } else {
            returnAuthors.push(match.original);
        }
    }

    return returnAuthors;
}

const rectifyNarrators = async (narrators: string[]): Promise<string[]> => {
    const corrected: Correction[] = [];
    for (const narrator of narrators) {
        corrected.push({
            s: narrator.toLocaleLowerCase().replaceAll(' ', '').replaceAll('.', '').trim(),
            original: narrator
        });
    }

    const dbNarrators = await prisma.author.findMany();
    const narratorsSearchable: Correction[] = [];
    for (const narrator of dbNarrators) {
        narratorsSearchable.push({
            s: narrator.name.toLocaleLowerCase().replaceAll(' ', '').replaceAll('.', '').trim(),
            original: narrator.name
        });
    }

    const returnNarrators: string[] = [];
    for (const entry of corrected) {
        const match = narratorsSearchable.find((a) => a.s === entry.s);
        if (match === undefined) {
            returnNarrators.push(entry.original);
        } else {
            returnNarrators.push(match.original);
        }
    }

    return returnNarrators;
}

const addAuthors = async (names: string[]) => {
    for (const name of names) {
        try {
            await prisma.author.create({ data: { name } });
        } catch (e) {
            // The author already existed
        }
    }
}

const addNarrators = async (names: string[]) => {
    for (const name of names) {
        try {
            await prisma.narrator.create({ data: { name } });
        } catch (e) {
            // The narrator already existed
        }
    }
}

const addGenres = async (tags: string[]) => {
    for (const tag of tags) {
        try {
            await prisma.genre.create({ data: { tag } });
        } catch (e) {
            // The genre already existed
        }
    }
}

const addSeries = async (title: string) => {
    try {
        await prisma.series.create({ data: { title } });
    } catch (e) {
        // The series already existed
    }
}


// --------------------------------------------------------------------------------------------
// Parser
// --------------------------------------------------------------------------------------------

const processBook = async (book: BookFromCLI, id: string): Promise<boolean> => {

    // Get values for the DB from the book object
    const asin = book.asin;

    const title = book.title;
    const subtitle = book.subtitle;
    let authors = (book.authors.trim().split(',')).map(s => s.trim());
    let narrators = (book.narrators?.trim().split(','))?.map(s => s.trim());
    const series_title = book.series_title;
    const series_sequence = (book.series_sequence === undefined) ? NaN : parseInt(book.series_sequence);
    const unfilteredGenres = (book.genres.trim().split(/[&,]+/)).map(s => s.trim());
    const genres = unfilteredGenres.filter((elem, pos) => unfilteredGenres.indexOf(elem) == pos);
    const runtime_length_min = book.runtime_length_min;
    const rating = parseFloat(book.rating);
    const num_ratings = book.num_ratings;
    const release_date = Math.floor(new Date(book.release_date).getTime() / 1000);
    let cover_url_50: string; 
    let cover_url_100: string;
    let cover_url_500: string;
    let cover_url_1000: string;
    const purchase_date = Math.floor(new Date(book.purchase_date).getTime() / 1000)

    if (book.cover_url === undefined) {
        cover_url_50 = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&size=50`;
        cover_url_100 = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&size=100`;
        cover_url_500 = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&size=500`;
        cover_url_1000 = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&size=1000`;
    } else {
        cover_url_50 = book.cover_url.replace(/_SL([0-9]*)_/, `_SL50_`);
        cover_url_100 = book.cover_url.replace(/_SL([0-9]*)_/, `_SL100_`);
        cover_url_500 = book.cover_url.replace(/_SL([0-9]*)_/, `_SL500_`);
        cover_url_1000 = book.cover_url.replace(/_SL([0-9]*)_/, `_SL1000_`);
    }

    // Step 1: See if this book is already in the library. If not, add it. If so, update it if need-be
    const existingBook = await prisma.book.findUnique({ where: { asin } });
    if (existingBook !== null) {
        // The book was found. We will add this account to it and update the ratings
        try {
            await prisma.book.update({
                where: { asin },
                data: {
                    profiles: { connect: { id } },
                    num_ratings,
                    rating
                }
            });
        } catch (e) {
            // The account was already there. Nothing to do.
        }
        return false;
    }

    // The book was not found, we can add it
    // Step 2: Add the authors and narrators if needed
    // TODO: Make this rectification process faster
    authors = await rectifyAuthors(authors);
    narrators = await rectifyNarrators(narrators??[]);

    await addAuthors(authors);
    await addNarrators(narrators??[]);
    let genresConnect = undefined;
    if (!(genres.length === 1 && genres[0] === '')) {
        await addGenres(genres);
        genresConnect = { connect: genres.map((a) => { return { tag: a } }) };
    }
    let seriesConnect = undefined;
    if (series_title !== '' && series_title !== undefined) {
        await addSeries(series_title);
        seriesConnect = { connect: { title: series_title } }
    };


    const cover = helpers.toBuffer(await (await fetch(cover_url_500)).arrayBuffer());
    let colorDom: string | undefined = undefined;
    let brightDom: boolean | undefined = undefined;
    let colorSqrt: string | undefined = undefined;
    let brightSqrt: boolean | undefined = undefined;
    let colorSimple: string | undefined = undefined;
    let brightSimple: boolean | undefined = undefined;

    const calculateColors = async () => Promise.all([
        getAverageColor(cover, { algorithm: 'dominant' }),
        getAverageColor(cover, { algorithm: 'sqrt' }),
        getAverageColor(cover, { algorithm: 'simple' }),
    ]);

    try {
        const [
            dominant,
            sqrt,
            simple
        ] = await calculateColors()

        colorDom = dominant.hex;
        brightDom = dominant.isLight;
        colorSqrt = sqrt.hex;
        brightSqrt = sqrt.isLight;
        colorSimple = simple.hex;
        brightSimple = simple.isLight;

    } catch (error) {
        console.log('Error processing colors: ', error);
    }


    // Step 3: Add the book
    await prisma.book.create({
        data: {
            asin: asin,
            title: title,
            subtitle: subtitle,
            profiles: { connect: { id } },
            authors: { connect: authors.map((a) => { return { name: a } }) },
            narrators: { connect: narrators?.map((a) => { return { name: a } }) },
            series: seriesConnect,
            series_sequence: isNaN(series_sequence) ? undefined : series_sequence,
            genres: genresConnect,
            runtime_length_min: runtime_length_min,
            rating: rating,
            num_ratings: num_ratings,
            release_date: release_date,
            purchase_date: purchase_date,
            downloaded: false,
            processed: false,
            progress: 0,
            cover: {
                create: {
                    url_50: cover_url_50,
                    url_100: cover_url_100,
                    url_500: cover_url_500,
                    url_1000: cover_url_1000,
                    hex_dom: colorDom,
                    hex_dom_bright: brightDom,
                    hex_sim: colorSqrt,
                    hex_sim_bright: brightSqrt,
                    hex_sqr: colorSimple,
                    hex_sqr_bright: brightSimple
                }
            }
        }
    });

    await saveGoogleAPIDetails(asin, title, authors);

    return true;
}

/**
 * Parse a library JSON file and import all the books to the DB
 * @param id the account to associate the book with
 */
export const get = async (id: string): Promise<{ numCreated: number, numUpdated: number } | null> => {
    // Check that the ID was actually submitted
    if (id === null || id === undefined) return null;

    // Get the profile from the database
    const profile = await prisma.profile.findUnique({ where: { id } });

    // Return if the profile was not found
    if (profile === null || profile === undefined || isLocked()) return null;

    // Create a temp directory for this library
    if (!fs.existsSync(`/tmp`)) fs.mkdirSync(`/tmp`);

    // Make sure the config file is written
    await writeConfigFile();

    try {
        child_process.execSync(`audible -P ${id} library export --format json -o /tmp/${id}.library.json`);
        const library = JSON.parse(fs.readFileSync(`/tmp/${id}.library.json`).toString()) as Library;
        let numCreated = 0;
        let numUpdated = 0;
        for (const book of library) {
            if (await processBook(book, id)) numCreated++;
            else numUpdated++;
        }
        try {
            fs.rmSync(`/tmp/${id}.library.json`, { recursive: true, force: true });
        } catch (e) { }

        // Update the last sync time
        await prisma.profile.update({
            where: { id },
            data: {
                last_sync: Math.floor(new Date().getTime() / 1000)
            }
        })

        return { numCreated, numUpdated };
    } catch(e) {
        // Didn't work
        console.log('ERR');
        const err = e as { stdout: Buffer };
        console.log(err);
        console.log(err.stdout.toString())
        try {
            fs.rmSync(`/tmp/${id}.library.json`, { recursive: true, force: true });
        } catch (e) { }
        return null
    }
}