import { Low, JSONFile } from 'lowdb';
import type { Data } from '$lib/types';
const dbObj = new Low(new JSONFile<Data>('db.json'));
let loaded = false;

const dbPromise = new Promise<void>((resolve, reject) => {
    dbObj
        .read()
        .then(() => {
            dbObj.data ||= { library: {}, profiles: {} } as Data;
            dbObj.write().then(() => {
                if (dbObj.data === null) {
                    reject('could not load');
                } else {
                    loaded = true;
                    resolve();
                }
            });
        })
        .catch((err) => {
            reject(err);
        });
});

/**
 * Get the database object data with type Data
 *
 * @returns Promise<Data>
 */
export const data = async (): Promise<Data> => {
    if (!loaded) await Promise.allSettled([dbPromise]);
    return dbObj.data as Data;
};

export const get = async (): Promise<Low<Data>> => {
    if (!loaded) await Promise.allSettled([dbPromise]);
    return dbObj;
};

/**
 * Write to the database
 */
export const write = async (): Promise<void> => {
    if (!loaded) await Promise.allSettled([dbPromise]);
    await dbObj.write();
};
