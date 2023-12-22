import { browser } from '$app/environment';
import * as https from 'https';
import * as dateFns from 'date-fns';
import icons from '$lib/components/icons';
import { getTimeZones } from '@vvo/tzdb';

const timeZonesWithUtc = getTimeZones({ includeUtc: true });

/**
 * Validate a URL
 * @see https://www.makeuseof.com/regular-expressions-validate-url/
 * @param url the URL to validate
 * @returns Whether or not it was valid
 */
export const validateURL = (url: string) => {
	return /^(http(s):\/\/.)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/g.test(
		url
	);
};

/**
 * Fetch data from a URL
 * @param url the URL to fetch from
 * @returns the data
 */
export const fetch = async (url: string): Promise<string> => {
	return new Promise((resolve) => {
		let data = '';
		https.get(url, (res) => {
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => resolve(data));
		});
	});
};

/**
 * Deletes queries from the URL without affecting the search history
 *
 * @see https://dev.to/mohamadharith/mutating-query-params-in-sveltekit-without-page-reloads-or-navigations-2i2b
 *
 * @param params a string array of the params to delete
 */
export const deleteQueries = (params: string[]) => {
	// This can only run in the browser
	if (!browser) return;
	const url = new URL(window.location.toString());
	for (const param of params) url.searchParams.delete(param);
	history.replaceState({}, '', url);
};

// https://gist.github.com/jonleighton/958841
export const base64ArrayBuffer = (arrayBuffer: ArrayBuffer): string => {
	var base64 = '';
	var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	var bytes = new Uint8Array(arrayBuffer);
	var byteLength = bytes.byteLength;
	var byteRemainder = byteLength % 3;
	var mainLength = byteLength - byteRemainder;

	var a, b, c, d;
	var chunk;

	// Main loop deals with bytes in chunks of 3
	for (var i = 0; i < mainLength; i = i + 3) {
		// Combine the three bytes into a single integer
		chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

		// Use bitmasks to extract 6-bit segments from the triplet
		a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
		b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
		c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
		d = chunk & 63; // 63       = 2^6 - 1

		// Convert the raw binary segments to the appropriate ASCII encoding
		base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
	}

	// Deal with the remaining bytes and padding
	if (byteRemainder == 1) {
		chunk = bytes[mainLength];

		a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

		// Set the 4 least significant bits to zero
		b = (chunk & 3) << 4; // 3   = 2^2 - 1

		base64 += encodings[a] + encodings[b] + '==';
	} else if (byteRemainder == 2) {
		chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

		a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
		b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

		// Set the 2 least significant bits to zero
		c = (chunk & 15) << 2; // 15    = 2^4 - 1

		base64 += encodings[a] + encodings[b] + encodings[c] + '=';
	}

	return base64;
};

// https://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer
export const toBuffer = (arrayBuffer: ArrayBuffer): Buffer => {
	const buffer = Buffer.alloc(arrayBuffer.byteLength);
	const view = new Uint8Array(arrayBuffer);
	for (let i = 0; i < buffer.length; ++i) {
		buffer[i] = view[i];
	}
	return buffer;
};

export class RunTime {
	_value_s: number;
	constructor(options: { min?: number; s?: number }) {
		if (options.s !== undefined) {
			this._value_s = options.s;
		} else if (options.min !== undefined) {
			this._value_s = dateFns.minutesToSeconds(options.min);
		} else {
			throw new Error(
				`Must set a value of either seconds or minutes for RunTime. See options in constructor.`
			);
		}
	}

	public compareDuration(r: RunTime): number {
		const res = this._value_s / r._value_s;
		if (isNaN(res)) return 0;
		else return res;
	}

	public get hours(): number {
		return Math.ceil(this._value_s / 60 / 60);
	}

	public get minutes(): number {
		return Math.ceil(this._value_s / 60);
	}

	public get hoursMinutes(): { h: number; m: number } {
		const h = this._value_s / 60 / 60;
		return {
			h: Math.floor(h),
			m: Math.round((h % 1) * 60)
		};
	}

	public get hoursMinutesSeconds(): { h: number; m: number; s: number } {
		// 68580 => 19.05 hr
		const h = this._value_s / 60 / 60;
		const m = (h % 1) * 60;
		const s = Math.round((m % 1) * 60);
		return {
			h: Math.floor(h),
			m: Math.floor(m) + (s === 60 ? 1 : 0),
			s: s === 60 ? 0 : s
		};
	}

	public get h(): number {
		return this.hours;
	}

	public get m(): number {
		return this.minutes;
	}

	public get hm(): { h: number; m: number } {
		return this.hoursMinutes;
	}

	public get hms(): { h: number; m: number; s: number } {
		return this.hoursMinutesSeconds;
	}

	toFormat(): string {
		return dateFns.formatDistance(this._value_s * 1000, 0, { includeSeconds: true });
	}

	toDirectFormat(): string {
		const hm = this.hoursMinutes;
		return hm.h.toString().padStart(2, '0') + ':' + hm.m.toString().padStart(2, '0');
	}

	toDirectFormatFull(): string {
		const hms = this.hoursMinutesSeconds;
		return (
			hms.h.toString().padStart(2, '0') +
			':' +
			hms.m.toString().padStart(2, '0') +
			':' +
			hms.s.toString().padStart(2, '0')
		);
	}
}

/**
 * Round a number to a certain precision
 * @param n the number
 * @param p the precision. Defaults to 2.
 * @returns the rounded number
 */
export const round = (n: number, p = 2) => ((e) => Math.round(n * e) / e)(Math.pow(10, p));

/**
 * Get the ISO string for the local timezone
 * @param date_ms the date in ms
 * @param tz the TZ
 * @returns the ISO string for the local timezone
 */
export const toISOStringTZ = (date_ms: number, tz: string) => {
	const match = timeZonesWithUtc.find((v) => v.name === tz);
	if (match === undefined) return new Date(date_ms).toISOString();
	var tzoffset = -match.rawOffsetInMinutes * 60000; //offset in milliseconds
	return new Date(date_ms - tzoffset).toISOString().slice(0, -1) + match.abbreviation;
};

/**
 * Capitalize the first letter of a string
 * @param string the string
 * @returns the string with the first letter capitalized
 */
export const capitalizeFirstLetter = (string: string): string => {
	return string.charAt(0).toUpperCase() + string.slice(1);
};

export const truncateString = (str: string, num: number) => {
	// If the length of str is less than or equal to num
	// just return str--don't truncate it.
	if (str.length <= num) {
		return str;
	}
	// Return str truncated with '...' concatenated to the end of str.
	return str.slice(0, num) + '...';
};

/**
 * Array join, but only a certain number of elements. After that, add the post text instead
 * @param arr the array to join
 * @param limit max number of elements allowed
 * @param join the join string
 * @param postText the text to add at the end
 * @returns the joined array with a limited number of elements
 */
export const joinWithLimit = (
	arr: string[],
	limit: number,
	join: string = ', ',
	postText = 'and others'
): string => {
	if (arr.length <= limit) return arr.join(join);
	const reduced = arr.slice(0, limit);
	return reduced.join(join) + ' ' + postText;
};

/**
 * Basic plural string generation
 * @param base the base word, like 'Book' or 'Lens'
 * @param num the number of that item being represented
 * @returns the base with the proper plural ending
 */
export const basicPlural = (base: string, num: number) => {
	if (num === 1 || num === -1) {
		return base;
	} else {
		if (base.endsWith('s')) {
			return base + 'es';
		} else {
			return base + 's';
		}
	}
};

/**
 * Serialize an object to URL Search params
 * @param obj the object to serialize
 * @returns the URL encoded search string
 */
export const serialize = (obj: { [key: string]: string }): string => {
	const str = [];
	for (const p in obj) {
		if (obj.hasOwnProperty(p)) {
			if (obj[p] === undefined) continue;
			str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
		}
	}
	return str.join('&');
};

export const deepCopy = <T>(obj: T): T => {
	return JSON.parse(
		JSON.stringify(obj, (key, value) => {
			if (typeof value === 'bigint') return value.toString();
			else return value;
		})
	);
};

/**
 * Returns a number whose value is limited to the given range.
 *
 * Example: limit the output of this computation to between 0 and 255
 * (x * 255).clamp(0, 255)
 *
 * @param {Number} min The lower boundary of the output range
 * @param {Number} max The upper boundary of the output range
 * @returns A number in the range [min, max]
 * @type Number
 */
export const clamp = (val: number, min: number, max: number): number => {
	return Math.min(Math.max(val, min), max);
};

/**
 * Get an icon for an extension
 * @param ext the extension
 * @returns the icon
 */
export const extensionLogo = (ext: string): string => {
	let extension = ext;
	if (ext.charAt(0) === '.') extension = ext.substring(1);

	switch (extension) {
		case 'jpg':
		case 'png':
		case 'gif':
			return icons.image;
		case 'aaxc':
		case 'm4b':
			return icons.book;
		default:
			return icons.doc;
	}
};

/**
 * Convert a number of bytes to a more readable format
 * @param bytes the bytes to convert to string
 * @returns the string
 */
export const numBytesToString = (bytes: bigint | number): string => {
	if (typeof bytes === 'bigint') bytes = Number(bytes);
	const sizeKB = bytes / 1024;
	const sizeMB = sizeKB / 1024;
	const sizeGB = sizeMB / 1024;
	if (sizeGB < 0.5) {
		if (sizeMB < 0.5) {
			if (sizeKB < 0.5) {
				return bytes.toPrecision(3) + ' B';
			} else {
				return sizeKB.toPrecision(3) + ' KB';
			}
		} else {
			return sizeMB.toPrecision(3) + ' MB';
		}
	} else {
		return sizeGB.toPrecision(3) + ' GB';
	}
};
