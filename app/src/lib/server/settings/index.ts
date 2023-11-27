import { Settings } from '$lib/types';
import prisma from '$lib/server/prisma';
import * as crypto from 'node:crypto';

// -------------------------------------------------------------------------------------------------
// Settings
// -------------------------------------------------------------------------------------------------

/**
 * Get a setting from the DB
 * @param setting the setting to get
 * @returns the setting
 */
export const get = async <T extends Settings.TypeName>(setting: T): Promise<Settings.ObjectType<T>> => {

  // Make sure the setting can exist
  if (!(setting in Settings.defaultSettings)) throw Error(`Unknown setting: ${setting}`);

  // TODO: Cache some of these settings? Maybe the frequent ones? That way we don't have to do a DB
  //       call every time. Would only make sense for some settings though.

  // Pull the setting from the DB
  const settingVal = await prisma.settings.findUnique({ where: { setting }});

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
      case 'system.debug':
      case 'plex.enable':
      case 'plex.useToken':
      case 'plex.collections.enable':
      case 'plex.library.autoScan':
      case 'plex.library.scheduled':
        return (settingVal.value === 'true' ? true : false) as Settings.ObjectType<T>;

      // Integer Conversion ------------------------------------------------------------------------
      case 'progress.startTime':
      case 'progress.endTime':
      case 'plex.library.autoScanDelay':
        return parseInt(settingVal.value) as Settings.ObjectType<T>;

      // Float Conversion --------------------------------------------------------------------------
      case 'general.float':
        return parseFloat(settingVal.value) as Settings.ObjectType<T>;

      // String Conversion -------------------------------------------------------------------------
      case 'plex.address':
      case 'plex.token':
      case 'plex.username':
      case 'plex.password':
      case 'general.encKey':
      case 'general.string':
      case 'library.location':
        return settingVal.value as Settings.ObjectType<T>;

      // Enum Conversion ------------------------------------------------00-------------------------
      case 'plex.collections.by':
        return settingVal.value as Settings.ObjectType<T>;

      // Unknown -----------------------------------------------------------------------------------
      default:
        throw Error(`Unknown setting: ${setting}`);
    }
  } else {
    // It does not. Assign the default to the DB and return the default value.

    // First, check if this is a setting that needs a special default
    if (setting === 'general.encKey') {
      // It is. Generate the default
      const defaultVal = crypto.randomBytes(32).toString('hex') as Settings.ObjectType<T>;
      await prisma.settings.create({ data: { setting, value: defaultVal.toString() } });
      // Return the default value
      return defaultVal;  
    }

    // It is not. Get the default setting
    const defaultVal = (Settings.defaultSettings[setting] as Settings.ObjectType<T>);

    // Write the default value to the DB
    await prisma.settings.create({ data: { setting, value: defaultVal.toString() }});

    // Return the default value
    return defaultVal;
  }
}

/**
 * Set a setting in the database
 * @param setting the setting to modify
 * @param value the value to set it to
 */
export const set = async <T extends Settings.TypeName>(setting: T, value: Settings.ObjectType<T>) => {
  // Make sure the setting can exist
  if (!(setting in Settings.defaultSettings)) throw Error(`Unknown setting: ${setting}`);

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
}