import * as child_process from 'node:child_process';
import { isLocked, lock, unlock } from '../../';
import { v4 as uuidv4 } from 'uuid';
import * as helpers from '$lib/helpers';
import * as serverHelpers from '$lib/server/helpers';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as tools from '$lib/server/cmd/tools';
import { ProfileCreationError } from '../../types';
import type { AudibleConfig, AmazonAcctData } from '../../types';
import { SourceType, type CountryCode } from '$lib/types';
import * as crypto from 'crypto';
import prisma from '$lib/server/prisma';
import * as media from '$lib/server/media';
import { AUDIBLE_FOLDER, AUDIBLE_CMD } from '$lib/server/env';

const ENTER = '\n';

// --------------------------------------------------------------------------------------------
// Profile helpers
// --------------------------------------------------------------------------------------------

/**
 * Write the config file based on the database contents
 */
export const writeConfigFile = async () => {
	// Write the config.toml file
	// Delete it if it exists
	try {
		fs.unlinkSync(path.join(AUDIBLE_FOLDER, 'config.toml'));
	} catch (e) {
		// Nothing to do if it fails
	}
	// Get the profiles from the DB
	const sources = await prisma.source.findMany({
		where: {
			type: SourceType.AUDIBLE,
			NOT: { audible: null }
		},
		include: { audible: true }
	});

	for (const source of sources) {
		if (source.audible === null) {
			console.log('ERROR: Source has AUDIBLE tag but no audible object', source);
			return;
		}
	}

	// Only write the file if there is at least one profile
	if (sources.length !== 0) {
		let configFile = `title = "Audible Config File"\n\n[APP]\nprimary_profile = "${sources[0].audible?.cli_id}"\n\n`;
		for (const source of sources)
			configFile += `[profile.${source.audible?.cli_id}]\nauth_file = "${source.audible?.cli_id}.json"\ncountry_code = "${source.audible?.locale_code}"\n\n`;
		try {
			fs.mkdirSync(path.join(AUDIBLE_FOLDER), { recursive: true });
		} catch (e) {
			// Nothing to do if this fails
		}
		try {
			fs.writeFileSync(path.join(AUDIBLE_FOLDER, 'config.toml'), configFile);
		} catch (e) {
			console.error(e);
		}
	}
};

const getEmailDirect = async (cli_id: string): Promise<string | undefined> => {
	// Check that the ID was actually submitted
	if (cli_id === null || cli_id === undefined) return;

	try {
		const fileBuffer = fs.readFileSync(path.join(AUDIBLE_FOLDER ?? '/audible/', cli_id + '.json'));
		const data = JSON.parse(fileBuffer.toString()) as AudibleConfig;
		// Get the account info from Amazon
		const acctDataStr = await helpers.fetch(
			`https://api.amazon.com/user/profile?access_token=${data.access_token}`
		);
		const acctData = JSON.parse(acctDataStr) as AmazonAcctData;
		return acctData.email;
	} catch (e) {
		return;
	}
};

/**
 * Get the auth file object for a profile
 * @param id the id to get
 * @returns the profile object
 */
export const getAuthFile = async (id: string): Promise<AudibleConfig | undefined> => {
	// Check that the ID was actually submitted
	if (id === null || id === undefined) return;

	// Get the profile from the database
	const source = await prisma.source.findUnique({
		where: {
			type: SourceType.AUDIBLE,
			NOT: { audible: null },
			id
		},
		include: { audible: true }
	});

	// Return if the profile was not found
	if (source === null || source === undefined || source.audible === null || isLocked()) return;

	try {
		const fileBuffer = fs.readFileSync(
			path.join(AUDIBLE_FOLDER ?? '/audible/', source.audible?.cli_id + '.json')
		);
		return JSON.parse(fileBuffer.toString()) as AudibleConfig;
	} catch (e) {
		return;
	}
};

/**
 * Fetch and save various pieces of data from the auth-file to the database
 * @param id the profile
 * @returns the bytes
 */
export const fetchMetadata = async (
	id: string,
	includeProfile = true
): Promise<string | undefined> => {
	// Check that the ID was actually submitted
	if (id === null || id === undefined) return;

	// Get the profile from the database
	const source = await prisma.source.findUnique({
		where: {
			type: SourceType.AUDIBLE,
			NOT: { audible: null },
			id
		},
		include: { audible: true }
	});

	// Return if the profile was not found
	if (source === null || source === undefined || source.audible === null || isLocked()) return;

	// Make sure the config file is there
	await writeConfigFile();

	try {
		// Have the audible-cli get the activation bytes
		await new Promise<void>((resolve) => {
			child_process.exec(
				`${AUDIBLE_CMD} -P ${source.audible?.cli_id} activation-bytes`,
				{ env: { AUDIBLE_CONFIG_DIR: AUDIBLE_FOLDER } },
				() => resolve()
			);
		});
		// Get the auth file associated with this profile
		const authFile = await getAuthFile(id);
		// Make sure the file exists and the bytes are present
		if (authFile === undefined) return;
		if (authFile.activation_bytes === null) return;

		// Set a variable for email assignment
		let email = undefined;
		let profile_image_url = undefined;
		try {
			// Get the account info from Amazon
			const acctDataStr = await helpers.fetch(
				`https://api.amazon.com/user/profile?access_token=${authFile.access_token}`
			);
			const acctData = JSON.parse(acctDataStr) as AmazonAcctData;
			console.log(acctData);
			email = acctData.email;
			profile_image_url = '/api/image/' + id;
		} catch (e) {
			// Could not parse and therefore can't get the email address
		}

		let first_name: string | undefined = undefined;
		let last_name: string | undefined = undefined;

		if (includeProfile) {
			const hash =
				email === undefined
					? '00000000000000000000000000000000'
					: crypto.createHash('md5').update(email.trim().toLocaleLowerCase()).digest('hex');
			const image = await (
				await fetch(`https://www.gravatar.com/avatar/${hash}?s=300&d=identicon`)
			).arrayBuffer();
			const images = await serverHelpers.cropImages(image);
			console.log(images);

			// Delete any old profile images
			try {
				await prisma.profileImage.delete({ where: { id } });
			} catch (e) {
				// Nothing to do
			}

			// Store the profile image
			await prisma.profileImage.create({
				data: {
					full: images.full,
					i512: images.img512,
					i256: images.img256,
					i128: images.img128,
					i56: images.img56,
					content_type: 'image/png',
					id: id
				}
			});

			// Calculate names
			const nameArr = authFile.customer_info.name.split(' ');
			first_name = authFile.customer_info.given_name;
			const firstNameIndex = nameArr.indexOf(first_name);
			nameArr.splice(firstNameIndex, 1);
			last_name = nameArr.join(' ');
		}

		// Update the DB with the bytes
		await prisma.source.update({
			where: { id },
			data: {
				profile_image_url: profile_image_url
			}
		});
		await prisma.audibleAccount.update({
			where: { id },
			data: {
				activation_bytes: authFile.activation_bytes,
				first_name,
				last_name,
				email: email
			}
		});

		console.log('Account ' + id + 'added');

		// Return the bytes
		return authFile.activation_bytes;
	} catch (e) {
		// Something went wrong. No bytes.
		console.log('NO BYTES!', e);
		const err = e as { stdout: Buffer; stderr: Buffer };
		console.log(err.stdout);
		console.log(err.stderr);
		return;
	}
};

// --------------------------------------------------------------------------------------------
// Add new profile
// --------------------------------------------------------------------------------------------

// Add profile steps
// Step 1: Lock out audible usage because we have to delete the config to allow quickstart usage for more than 1 account
// Step 2: Start a static-context and go as far as to get the url for the user to log into via. For now, just use US.
// Step 3: Display the URL to the user and have the user paste the resulting URL into
// Step 4: After the login is a success, open the resulting json file and create the DB entry for the account.
// Step 5: Re-create the audible config file and unlock audible usage

enum ProfileState {
	PROFILE_NAME = 1,
	COUNTRY_CODE,
	AUTH_FILE_NAME,
	AUTH_FILE_ENCRYPT,
	EXTERNAL_BROWSER,
	PRE_AMAZON_ACCT,
	CONFIRM,
	GET_URL,
	ENTER_URL,
	CHECK_SUCCESS
}

let audible: child_process.ChildProcessWithoutNullStreams | undefined;
let audibleData = '';
let cli_id = '';
let cc: CountryCode;
let profileState = ProfileState.PROFILE_NAME;

if (global.audible === undefined) global.audible = { instance: undefined, cancelMap: {} };

/**
 * Get a login URL from the audible CLI
 * @returns the login URL
 * @rejects a ProfileCreationError if there was an error
 */
export const add = async (countryCode: CountryCode = 'us'): Promise<string> => {
	// Step 1: Lock out audible usage because we have to delete the config to allow quickstart usage for more than 1 account
	lock();
	try {
		fs.unlinkSync(path.join(AUDIBLE_FOLDER ?? '/audible/', 'config.toml'));
	} catch (e) {
		// Nothing to do if it fails
	}

	// Step 2: Start a static-context and go as far as to get the url for the user to log into via. For now, just use US.
	if (audible !== undefined) {
		audible.kill();
		audible = undefined;
		audibleData = '';
	}

	// Create the audible child_process
	audible = child_process.spawn(AUDIBLE_CMD, ['quickstart'], {
		env: { AUDIBLE_CONFIG_DIR: AUDIBLE_FOLDER }
	});
	global.audible.instance = audible;

	// Attach to the exit event
	audible?.on('exit', async () => {
		// Write the config file from the DB
		console.log('AUDIBLE EXIT');
		await writeConfigFile();
		// Unlock the audible-cli for use with other functions
		unlock();
		// Unassign the audible variable so the GC will clean up
		audible = undefined;
		// Clear the profile state
		profileState = ProfileState.PROFILE_NAME;
	});

	// Set initial state
	profileState = ProfileState.PROFILE_NAME;

	// Generate the new source id
	cli_id = uuidv4();
	cc = countryCode;

	// Wrap this in a promise so we can respond from this function
	const promise = new Promise<string>((resolve, reject) => {
		// Create a watchdog timeout identifier for use in the data processor
		let watchdog: NodeJS.Timeout;

		// Create the function for handling data
		const dataProcessor = (d: Buffer) => {
			// Convert the buffer data to a string
			const data = d.toString();

			// Add the data from the audible-cli to the running audibleData string
			audibleData += data;

			// Keep track of the state so we can see if it changes during this function. This is used
			// to automatically clear the audibleData string when the state changes
			const lastState = profileState;

			// Switch based on application state
			switch (profileState) {
				case ProfileState.PROFILE_NAME:
					if (
						audibleData.indexOf('Please enter a name for your primary profile [audible]: ') !== -1
					) {
						audible?.stdin.write(cli_id + ENTER);
						profileState = ProfileState.COUNTRY_CODE;
					}
					break;
				case ProfileState.COUNTRY_CODE:
					if (audibleData.indexOf('Enter a country code for the profile: ') !== -1) {
						audible?.stdin.write(countryCode + ENTER);
						profileState = ProfileState.AUTH_FILE_NAME;
					}
					break;
				case ProfileState.AUTH_FILE_NAME:
					if (
						audibleData.indexOf('Please enter a name for the auth file [') !== -1 &&
						audibleData.indexOf('.json]: ') !== -1
					) {
						audible?.stdin.write(cli_id + '.json' + ENTER);
						profileState = ProfileState.AUTH_FILE_ENCRYPT;
					}
					break;
				case ProfileState.AUTH_FILE_ENCRYPT:
					if (audibleData.indexOf('Do you want to encrypt the auth file? [y/N]: ') !== -1) {
						audible?.stdin.write('n' + ENTER);
						profileState = ProfileState.EXTERNAL_BROWSER;
					}
					break;
				case ProfileState.EXTERNAL_BROWSER:
					if (audibleData.indexOf('Do you want to login with external browser? [y/N]: ') !== -1) {
						audible?.stdin.write('y' + ENTER);
						profileState = ProfileState.PRE_AMAZON_ACCT;
					}
					break;
				case ProfileState.PRE_AMAZON_ACCT:
					if (
						audibleData.indexOf(
							'Do you want to login with a pre-amazon Audible account? [y/N]: '
						) !== -1
					) {
						audible?.stdin.write('n' + ENTER);
						profileState = ProfileState.CONFIRM;
					}
					break;
				case ProfileState.CONFIRM:
					if (audibleData.indexOf('Do you want to continue? [y/N]: ') !== -1) {
						audible?.stdin.write('y' + ENTER);
						profileState = ProfileState.GET_URL;
					}
					break;
				case ProfileState.GET_URL:
					if (audibleData.indexOf('Please insert the copied url (after login):') !== -1) {
						// We have the URL in the buffer and the audible-cli is ready for us to enter the resulting
						// login URL. Start by clearing the watchdog.
						clearTimeout(watchdog);

						// Prepare the URL so we can return it to the user
						const startOfURL = audibleData.indexOf('https://');
						const url = audibleData.substring(startOfURL, audibleData.indexOf('\n', startOfURL));

						// Validate the URL from the audible-cli
						if (!helpers.validateURL(url)) {
							// The URL is invalid, we can't continue. At this point, the function-caller should
							// call this function again in most cases.
							console.error(`Invalid URL: ${url}`);
							// Kill the process
							audible?.kill();
							// Reject with an error
							reject(ProfileCreationError.INVALID_GENERATED_URL);
						} else {
							// The URL is valid. We now change the state to waiting for the user to finish
							// going through the sign-in process. This is the end of this function
							profileState = ProfileState.ENTER_URL;
							// Remove this listener from the audible child process. Another data processor will be attached
							// and will enter the resulting URL from the user in another function
							audible?.stdout.removeListener('data', dataProcessor);
							// Resolve with the requested URL
							resolve(url);
						}
					}
					break;
				default:
					// Unknown state. This should not be possible. Kill the process.
					audible?.kill();
					profileState = ProfileState.PROFILE_NAME;
					reject(ProfileCreationError.UNKNOWN_STATE);
			}

			// Check for state change and clear the data string if it has changed
			if (lastState !== profileState) audibleData = '';
		};

		// Start a watchdog timer that will make sure the command didn't get hung-up while creating the
		// login URL.
		watchdog = setTimeout(() => {
			audible?.kill();
			reject(ProfileCreationError.CLI_TIMEOUT);
		}, 7500);

		// Attach the data processor to the output of the command
		audible?.stdout.on('data', dataProcessor);
	});

	return promise;
};

/**
 * Abort the profile add process and unlock the system
 */
export const cancelAdd = async () => {
	if (audible === undefined || isLocked() === false) return;
	audible.kill();
	// Write the config file
	await writeConfigFile();
	unlock();
};

/**
 * Submit a resulting URL to complete the profile login process
 * @param url the resulting URL from amazon
 * @returns a ProfileCreationError depending on the result
 */
export const submitURL = (
	url: string,
	name?: string
): Promise<{ e: ProfileCreationError; id: string | null }> => {
	// Check to make sure we are in a correct state to be running this function
	if (audible === undefined || profileState !== ProfileState.ENTER_URL)
		return new Promise((resolve) =>
			resolve({ e: ProfileCreationError.PROCESS_NOT_STARTED, id: null })
		);

	// Write the resulting URL to the audible-cli
	audible.stdin.write(url + ENTER);

	// Update the profile state
	profileState = ProfileState.CHECK_SUCCESS;

	// Wrap this in a promise so we can respond from this function
	const p = new Promise<{ e: ProfileCreationError; id: string }>((resolve, reject) => {
		// Assign id to be exported
		let exportID: string | null = null;

		// Create a watchdog timeout identifier for use in the data processor
		let watchdog: NodeJS.Timeout;

		// Create the function for handling data
		const dataProcessor = async (d: Buffer) => {
			// Convert the buffer data to a string
			const data = d.toString();

			// Add the data from the audible-cli to the running audibleData string
			audibleData += data;

			// Keep track of the state so we can see if it changes during this function. This is used
			// to automatically clear the audibleData string when the state changes
			const lastState = profileState;

			// Switch based on application state
			switch (profileState) {
				case ProfileState.CHECK_SUCCESS:
					if (audibleData.indexOf('Config written to config.toml') !== -1) {
						// Success. Clear the watchdog
						clearTimeout(watchdog);
						// Kill the audible-cli
						audible?.kill();
						// Get the email address for this account
						const email = await getEmailDirect(cli_id);
						const id = email === undefined ? `audible:${uuidv4()}` : `audible:${email}`;
						exportID = id;

						// Check that this ID does not already exist
						const verifySource = await prisma.source.findUnique({ where: { id } });
						if (verifySource !== null) {
							// This account already exists
							// Write the config file
							await writeConfigFile();
							// Unlock the audible-cli interface
							unlock();
							// Deregister this account from the CLI
							await remove('', cli_id);
							// Return failed
							reject(ProfileCreationError.ACCOUNT_ALREADY_EXISTS);
						} else {
							// Add this profile to the DB
							await prisma.source.create({
								data: {
									id: id,
									audible: {
										create: {
											email: email,
											cli_id: cli_id,
											locale_code: cc
										}
									},
									name:
										name === undefined || name === null || name === ''
											? email === undefined
												? 'My Audible Account'
												: email
											: name,
									type: SourceType.AUDIBLE,
									added_date: Math.floor(new Date().getTime() / 1000),
									auto_sync: true,
									connected: true
								}
							});
							// Write the config file
							await writeConfigFile();
							// Unlock the audible-cli interface
							unlock();
							// Assign the values from the auth-file to the database profile entry
							await fetchMetadata(id);
							// Resolve
							resolve({ e: ProfileCreationError.NO_ERROR, id: exportID });
						}
					} else if (audibleData.indexOf('Exception') !== -1) {
						// Failure. Clear the watchdog
						clearTimeout(watchdog);
						// Kill the audible-cli
						audible?.kill();
						// Unlock the audible-cli interface
						unlock();
						// Print the error
						// TODO: Print this better
						console.error(audibleData);
						// Reject with the error
						reject(ProfileCreationError.URL_DID_NOT_WORK);
					}
					break;
				default:
					// Unknown state. This should not be possible. Kill the process.
					audible?.kill();
					profileState = ProfileState.PROFILE_NAME;
					reject(ProfileCreationError.UNKNOWN_STATE);
			}

			// Check for state change and clear the data string if it has changed
			if (lastState !== profileState) audibleData = '';
		};

		// Start a watchdog timer that will make sure the command didn't get hung-up while finishing
		// the login process.
		watchdog = setTimeout(() => {
			audible?.kill();
			reject(ProfileCreationError.CLI_TIMEOUT);
		}, 15000);

		// Attach the data processor to the output of the command
		audible?.stdout.on('data', dataProcessor);
	});

	return p;
};

// --------------------------------------------------------------------------------------------
// Remove profile
// --------------------------------------------------------------------------------------------

/**
 * Remove a profile
 * @param id the profile ID to remove
 */
export const remove = async (
	id: string,
	override_use_cli_id: string | null = null
): Promise<boolean> => {
	// Check that the ID was actually submitted
	if (override_use_cli_id === null && (id === null || id === undefined)) return false;

	// Get the profile from the database
	const source = await prisma.source.findUnique({
		where: {
			type: SourceType.AUDIBLE,
			NOT: { audible: null },
			id
		},
		include: { audible: true }
	});

	console.log('source', source);

	// Return if the profile was not found
	if (
		(override_use_cli_id === null &&
			(source === null || source === undefined || source.audible === null)) ||
		isLocked()
	)
		return false;

	// TODO: Await audible-cli unlock

	const cli_id = source === null ? override_use_cli_id : source.audible?.cli_id;

	// audible manage auth-file remove
	// Please enter name for the auth file:
	// Haley's 17th Audible for iPhone deregistered

	// Create the audible child_process
	let audible = child_process.spawn(AUDIBLE_CMD, ['manage', 'auth-file', 'remove'], {
		env: { AUDIBLE_CONFIG_DIR: AUDIBLE_FOLDER }
	});

	// Attach to the exit event
	audible?.on('exit', async () => {
		// Write the config file from the DB
		await writeConfigFile();
	});

	let audibleData = '';
	enum RemoveState {
		ENTER_AUTH = 1,
		FINISHED,
		PARK
	}

	// Set initial state
	let state = RemoveState.ENTER_AUTH;

	// Wrap this in a promise so we can respond from this function
	const promise = new Promise<boolean>((resolve) => {
		// Create a watchdog timeout identifier for use in the data processor
		let watchdog: NodeJS.Timeout;

		// Create the function for handling data
		const dataProcessor = async (d: Buffer) => {
			// Convert the buffer data to a string
			const data = d.toString();

			// Add the data from the audible-cli to the running audibleData string
			audibleData += data;

			// Keep track of the state so we can see if it changes during this function. This is used
			// to automatically clear the audibleData string when the state changes
			const lastState = state;

			// Switch based on application state
			switch (state) {
				case RemoveState.ENTER_AUTH:
					if (audibleData.indexOf('Please enter name for the auth file: ') !== -1) {
						audible?.stdin.write(cli_id + '.json' + ENTER);
						state = RemoveState.FINISHED;
					}
					break;
				case RemoveState.FINISHED:
					if (
						audibleData.indexOf('deregistered') !== -1 ||
						audibleData.indexOf("error: The file doesn't") !== -1
					) {
						// We have the URL in the buffer and the audible-cli is ready for us to enter the resulting
						// login URL. Start by clearing the watchdog.
						clearTimeout(watchdog);
						audible.kill();
						// Remove the data from the DB.
						if (source !== null) await tools.deleteSource(source.id);
						state = RemoveState.PARK;
						resolve(true);
					} else if (audibleData.indexOf('Aborted!') !== -1) {
						// Start by clearing the watchdog
						clearTimeout(watchdog);
						audible.kill();
						// We couldn't find the profile to remove
						state = RemoveState.PARK;
						resolve(false);
					}
					break;
			}

			// Check for state change and clear the data string if it has changed
			if (lastState !== state) audibleData = '';
		};

		// Start a watchdog timer that will make sure the command didn't get hung-up while creating the
		// login URL.
		watchdog = setTimeout(() => {
			audible?.kill();
			console.log('watchdog killed');
			resolve(false);
		}, 15000);

		// Attach the data processor to the output of the command
		audible?.stdout.on('data', dataProcessor);
	});

	return promise;
};
