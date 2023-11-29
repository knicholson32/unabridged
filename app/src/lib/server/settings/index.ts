import * as types from '$lib/types';
import prisma from '$lib/server/prisma';
import * as crypto from 'node:crypto';

export type TypeName =
  'progress.running' |
  'progress.paused' |
  'progress.startTime' |
  'progress.endTime' |
  'progress.startPaused' |

  'search.autoSubmit' |

  'system.debug' |
  'system.cron.enable' |
  'system.cron.maxRun' |
  'system.cron.record' | 
  'system.cron' |

  'plex.enable' |
  'plex.apiTimeout' |
  'plex.address' |
  'plex.token' |
  'plex.friendlyName' |
  'plex.library.autoScan' |
  'plex.library.autoScanDelay' |
  'plex.library.scheduled' |
  'plex.collections.enable' |
  'plex.collections.by' |

  'library.location' |

  'general.autoSync' |
  'general.encKey' |
  'general.string' |
  'general.float'
  ;

export type ObjectType<T> =
  T extends 'progress.running' ? boolean :           // Boolean
  T extends 'progress.paused' ? boolean :            // Boolean
  T extends 'progress.startTime' ? number :          // Integer
  T extends 'progress.endTime' ? number :            // Integer
  T extends 'progress.startPaused' ? boolean :       // Integer

  T extends 'search.autoSubmit' ? boolean :          // Boolean

  T extends 'system.debug' ? number :                // Integer
  T extends 'system.cron.enable' ? boolean :         // Boolean
  T extends 'system.cron.maxRun' ? number :          // Integer
  T extends 'system.cron.record' ? string :          // String
  T extends 'system.cron' ? string :                 // String

  T extends 'plex.enable' ? boolean :                // Boolean
  T extends 'plex.apiTimeout' ? number :             // Integer
  T extends 'plex.address' ? string :                // String
  T extends 'plex.token' ? string :                  // String
  T extends 'plex.friendlyName' ? string :           // String
  T extends 'plex.library.autoScan' ? boolean :      // Boolean
  T extends 'plex.library.scheduled' ? boolean :     // Boolean
  T extends 'plex.library.autoScanDelay' ? number :  // Integer
  T extends 'plex.collections.enable' ? boolean :    // Boolean
  T extends 'plex.collections.by' ? types.CollectionBy :   // Enum

  T extends 'library.location' ? string :            // String

  T extends 'general.autoSync' ? boolean :           // Boolean
  T extends 'general.encKey' ? string :              // String
  T extends 'general.string' ? string :              // String
  T extends 'general.float' ? number :               // Float
  never;

export const defaultSettings: { [key in TypeName]: any } = {
  'progress.running': true,
  'progress.paused': true,
  'progress.startTime': -1,
  'progress.endTime': -1,
  'progress.startPaused': false,

  'search.autoSubmit': true,

  'system.debug': 0,
  'system.cron.enable': true,
  'system.cron.maxRun': 7200, // Seconds (2hr)
  'system.cron.record': '',
  'system.cron': '0 4 * * *',

  'plex.enable': false,
  'plex.apiTimeout': 3000, // ms
  'plex.address': '127.0.0.1',
  'plex.token': '',
  'plex.friendlyName': '',
  'plex.library.autoScan': true,
  'plex.library.scheduled': true,
  'plex.library.autoScanDelay': 60,
  'plex.collections.enable': true,
  'plex.collections.by': types.CollectionBy.series,

  'library.location': '/library',

  'general.autoSync': true,
  'general.encKey': 'UNSET',
  'general.string': 'test',
  'general.float': 3.14
}

// -------------------------------------------------------------------------------------------------
// Settings
// -------------------------------------------------------------------------------------------------

/**
 * Get a setting from the DB
 * @param setting the setting to get
 * @returns the setting
 */
export const get = async <T extends TypeName>(setting: T): Promise<ObjectType<T>> => {

  // Make sure the setting can exist
  if (!(setting in defaultSettings)) throw Error(`Unknown setting: ${setting}`);

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
      case 'system.cron.enable':
      case 'plex.enable':
      case 'plex.collections.enable':
      case 'plex.library.autoScan':
      case 'plex.library.scheduled':
        return (settingVal.value === 'true' ? true : false) as ObjectType<T>;

      // Integer Conversion ------------------------------------------------------------------------
      case 'progress.startTime':
      case 'progress.endTime':
      case 'system.cron.maxRun':
      case 'system.debug':
      case 'plex.apiTimeout':
      case 'plex.library.autoScanDelay':
        return parseInt(settingVal.value) as ObjectType<T>;

      // Float Conversion --------------------------------------------------------------------------
      case 'general.float':
        return parseFloat(settingVal.value) as ObjectType<T>;

      // String Conversion -------------------------------------------------------------------------
      case 'system.cron':
      case 'system.cron.record':
      case 'plex.address':
      case 'plex.token':
      case 'plex.friendlyName':
      case 'general.encKey':
      case 'general.string':
      case 'library.location':
        return settingVal.value as ObjectType<T>;

      // Enum Conversion ------------------------------------------------00-------------------------
      case 'plex.collections.by':
        return settingVal.value as ObjectType<T>;

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
    const defaultVal = (defaultSettings[setting] as ObjectType<T>);

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
export const set = async <T extends TypeName>(setting: T, value: ObjectType<T>) => {
  // Make sure the setting can exist
  if (!(setting in defaultSettings)) throw Error(`Unknown setting: ${setting}`);

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