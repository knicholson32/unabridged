import prisma from '$lib/server/prisma';
import * as crypto from 'node:crypto';
import * as helpers from '$lib/server/helpers';
import type { Prisma } from '@prisma/client';

export const TypeNames = {
	// Progress ------------------------------
	'progress.running': true,
	'progress.paused': true,
	'progress.startTime': -1,
	'progress.endTime': -1,
	'progress.startPaused': false,
	// Search --------------------------------
	'search.autoSubmit': true,
	// System --------------------------------
	'system.debug': 0,
	'system.cron.enable': true,
	'system.cron.maxRun': 7200,
	'system.cron.record': '',
	'system.cron': '0 4 * * *',
	// Audiobookshelf ------------------------
	'abs.enable': false,
	'abs.address': '',
	'abs.linkAddress': '', // URL browsers use to open ABS, if different from abs.address
	'abs.apiKey': '', // Encrypted
	'abs.apiTimeout': 5000,
	'abs.serverVersion': '', // From the last successful connection test
	'abs.username': '', // ABS user the API key belongs to
	'abs.library.id': '',
	'abs.library.name': '',
	'abs.library.folderId': '', // Only needed for libraries with several folders; '' = first
	// Audiobookshelf.Scan -------------------
	'abs.scan.enable': true,
	'abs.scan.delay': 15,
	'abs.scan.timeout': 1200,
	'abs.scan.scheduled': false,
	'abs.scan.nextRun': -1,
	'abs.scan.inProgress': false,
	// Library -------------------------------
	'library.location': '/library',
	// Whether metadata.json has been written for existing books. False on new and upgraded
	// installs, so the files are written once on the next start (see metadata.writeAllSidecarsOnce).
	'library.metadataFilesWritten': false,
	// General -------------------------------
	'general.autoSync': true,
	'general.encKey': 'UNSET',
	'general.timezone': process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone
};

export type TypeName = keyof typeof TypeNames;

export type ObjectType<T extends TypeName> = T extends 'progress.running'
	? boolean // Boolean
	: T extends 'progress.paused'
	? boolean // Boolean
	: T extends 'progress.startTime'
	? number // Integer
	: T extends 'progress.endTime'
	? number // Integer
	: T extends 'progress.startPaused'
	? boolean // Integer
	: T extends 'search.autoSubmit'
	? boolean // Boolean
	: T extends 'system.debug'
	? number // Integer
	: T extends 'system.cron.enable'
	? boolean // Boolean
	: T extends 'system.cron.maxRun'
	? number // Integer
	: T extends 'system.cron.record'
	? string // String
	: T extends 'system.cron'
	? string // String
	: T extends 'abs.enable'
	? boolean // Boolean
	: T extends 'abs.address'
	? string // String
	: T extends 'abs.linkAddress'
	? string // String
	: T extends 'abs.apiKey'
	? string // String (encrypted)
	: T extends 'abs.apiTimeout'
	? number // Integer
	: T extends 'abs.serverVersion'
	? string // String
	: T extends 'abs.username'
	? string // String
	: T extends 'abs.library.id'
	? string // String
	: T extends 'abs.library.name'
	? string // String
	: T extends 'abs.library.folderId'
	? string // String
	: T extends 'abs.scan.enable'
	? boolean // Boolean
	: T extends 'abs.scan.delay'
	? number // Integer
	: T extends 'abs.scan.timeout'
	? number // Integer
	: T extends 'abs.scan.scheduled'
	? boolean // Boolean
	: T extends 'abs.scan.nextRun'
	? number // Integer
	: T extends 'abs.scan.inProgress'
	? boolean // Boolean
	: T extends 'library.location'
	? string // String
	: T extends 'library.metadataFilesWritten'
	? boolean // Boolean
	: T extends 'general.autoSync'
	? boolean // Boolean
	: T extends 'general.encKey'
	? string // String
	: T extends 'general.timezone'
	? string // String
	: string;

// -------------------------------------------------------------------------------------------------
// Settings
// -------------------------------------------------------------------------------------------------

export type SettingPayload = Prisma.SettingsGetPayload<{}>;

/**
 * Get a setting from the DB
 * @param setting the setting to get
 * @returns the setting
 */
export const get = async <T extends TypeName>(
	setting: T,
	settingVal?: SettingPayload | null
): Promise<ObjectType<T>> => {
	// Make sure the setting can exist
	if (!(setting in TypeNames)) throw Error(`Unknown setting: ${setting}`);

	// TODO: Cache some of these settings? Maybe the frequent ones? That way we don't have to do a DB
	//       call every time. Would only make sense for some settings though. Makes even less sense
	//       now that we have `getMany`.

	// Pull the setting from the DB
	if (settingVal === undefined)
		settingVal = await prisma.settings.findUnique({ where: { setting } });

	// Check if it exists
	if (settingVal !== undefined && settingVal !== null) {
		// It does. Fetch, cast and return.
		switch (setting) {
			// Boolean Conversion ------------------------------------------------------------------------
			case 'progress.running':
			case 'progress.paused':
			case 'progress.startPaused':
			case 'search.autoSubmit':
			case 'general.autoSync':
			case 'system.cron.enable':
			case 'abs.enable':
			case 'abs.scan.enable':
			case 'abs.scan.scheduled':
			case 'abs.scan.inProgress':
			case 'library.metadataFilesWritten':
				return (settingVal.value === 'true' ? true : false) as ObjectType<T>;

			// Integer Conversion ------------------------------------------------------------------------
			case 'progress.startTime':
			case 'progress.endTime':
			case 'system.cron.maxRun':
			case 'system.debug':
			case 'abs.apiTimeout':
			case 'abs.scan.delay':
			case 'abs.scan.timeout':
			case 'abs.scan.nextRun':
				return parseInt(settingVal.value) as ObjectType<T>;

			// String Conversion -------------------------------------------------------------------------
			case 'system.cron':
			case 'system.cron.record':
			case 'general.encKey':
			case 'general.timezone':
			case 'library.location':
			case 'abs.address':
			case 'abs.linkAddress':
			case 'abs.serverVersion':
			case 'abs.username':
			case 'abs.library.id':
			case 'abs.library.name':
			case 'abs.library.folderId':
				return settingVal.value as ObjectType<T>;

			// Encrypted Strings -------------------------------------------------------------------------
			case 'abs.apiKey':
				return (await helpers.decrypt(settingVal.value)) as ObjectType<T>;

			// Unknown -----------------------------------------------------------------------------------
			default:
				throw Error(`Unknown setting: ${setting}`);
		}
	} else {
		// It does not. Assign the default to the DB and return the default value.

		// First, check if this is a setting that needs a special default
		if (setting === 'general.encKey') {
			// It is. Generate the default
			const defaultVal = crypto.randomBytes(32).toString('hex') as ObjectType<T>;
			console.log('def', setting, defaultVal);
			await prisma.settings.create({ data: { setting, value: defaultVal.toString() } });
			// Return the default value
			return defaultVal;
		}

		// It is not. Get the default setting
		const defaultVal = TypeNames[setting] as unknown as ObjectType<T>;

		// Write the default value to the DB
		await prisma.settings.create({ data: { setting, value: defaultVal.toString() } });

		// Return the default value
		return defaultVal;
	}
};

// Generate two helpers types that will allow us to select based on the settings
export type SettingsSet<
	T extends TypeName,
	Prefix extends string
> = T extends `${Prefix}.${infer Rest}` ? T : never;
type SettingsPrefix<T extends TypeName, Prefix extends string> = T extends `${Prefix}.${infer Rest}`
	? Prefix
	: never;

/**
 * Get a set of settings, as long as they match a certain prefix
 * @param prefix the prefix to match
 * @returns an object with the settings
 */
export const getSet = async <Prefix extends string>(
	prefix: SettingsPrefix<TypeName, Prefix>
): Promise<{ [K in SettingsSet<TypeName, Prefix>]: ObjectType<K> }> => {
	// Get the possible settings keys based on the prefix
	const keys = (Object.keys(TypeNames) as TypeName[]).filter((key) =>
		key.startsWith(prefix)
	) as SettingsSet<TypeName, Prefix>[];
	// Initialize a resulting settings object, typed to only include the settings we will return
	const settings = {} as { [K in (typeof keys)[number]]: ObjectType<K> };

	// Get the settings from the DB
	const manySettings = await prisma.settings.findMany({
		where: { setting: { startsWith: prefix } }
	});

	// Loop through the possible settings
	for (const key of keys) {
		// If the setting does not exist, error. Since we generated the keys array right above this, we should never get this error.
		if (!(key in TypeNames)) throw Error(`Unknown setting: ${key}`);
		// Find the setting from the DB, if it is in there
		const keyIdx = manySettings.findIndex((s) => s.setting === key);
		// If it is, pass it to the basic `get` function so it can be properly cast
		if (keyIdx !== -1) settings[key] = (await get(key, manySettings[keyIdx])) as never;
		// If not, return a default value
		else settings[key] = TypeNames[key] as never;
	}

	// Return the settings
	return settings;
};

// Generate a helper type that will allow us to select based on settings
type FilterSettingsMany<T extends TypeName, Search extends string> = T extends `${Search}`
	? T
	: never;

/**
 * Get many fully-qualified settings
 * @param settings the settings to get
 * @returns an object with the settings
 */
export const getMany = async <T extends TypeName>(
	...settings: T[]
): Promise<{ [K in FilterSettingsMany<TypeName, T>]: ObjectType<K> }> => {
	// Get the possible settings keys based on the inputs. This protects against uncaught typescript errors
	const keys: TypeName[] = [];
	for (const setting of settings) if (setting in TypeNames) keys.push(setting);
	// Initialize a resulting settings object, typed to only include the settings we will return
	const results = {} as { [K in (typeof keys)[number]]: ObjectType<K> };

	// Get the settings from the DB
	const manySettings = await prisma.settings.findMany({ where: { setting: { in: settings } } });

	// Loop through the requested settings
	for (const key of keys) {
		// If the setting does not exist, error.
		if (!(key in TypeNames)) throw Error(`Unknown setting: ${key}`);
		// Find the setting from the DB, if it is in there
		const keyIdx = manySettings.findIndex((s) => s.setting === key);
		// If it is, pass it to the basic `get` function so it can be properly cast
		if (keyIdx !== -1) results[key] = (await get(key, manySettings[keyIdx])) as never;
		// If not, return a default value
		else results[key] = TypeNames[key] as never;
	}

	// Return the settings
	return results;
};

/**
 * Set a setting in the database
 * @param setting the setting to modify
 * @param value the value to set it to
 */
export const set = async <T extends TypeName>(setting: T, value: ObjectType<T>) => {
	// Make sure the setting can exist
	if (!(setting in TypeNames)) throw Error(`Unknown setting: ${setting}`);

	if (setting === 'abs.apiKey') {
		value = (await helpers.encrypt(value as string)) as ObjectType<T>;
	}

	// Create or modify the value
	await prisma.settings.upsert({
		create: {
			setting,
			value: value.toString()
		},
		update: {
			value: value.toString()
		},
		where: { setting }
	});
};
