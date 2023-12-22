import sharp from 'sharp';
import * as helpers from '$lib/helpers';
import sanitize from 'sanitize-filename';
import * as settings from '$lib/server/settings';
import { ENC_SALT } from '$lib/server/env';
import * as crypto from 'node:crypto';
import zlib from 'node:zlib';

export type Images = {
	full: Buffer;
	img512: Buffer;
	img256: Buffer;
	img128: Buffer;
	img56: Buffer;
};

export const cropImages = async (image: ArrayBuffer): Promise<Images> => {
	const imageBuffer = helpers.toBuffer(image);
	const initial = sharp(imageBuffer);
	const w = (await initial.metadata()).width ?? 0;
	const h = (await initial.metadata()).height ?? 0;
	let full;
	if (w >= h) {
		full = await sharp(imageBuffer).resize({ width: h, height: h, fit: 'cover' }).toBuffer();
	} else {
		full = await sharp(imageBuffer).resize({ width: w, height: w, fit: 'cover' }).toBuffer();
	}

	const img512 = await sharp(imageBuffer)
		.resize({ width: 512, height: 512, fit: 'cover' })
		.toBuffer();
	const img256 = await sharp(imageBuffer)
		.resize({ width: 256, height: 256, fit: 'cover' })
		.toBuffer();
	const img128 = await sharp(imageBuffer)
		.resize({ width: 128, height: 128, fit: 'cover' })
		.toBuffer();
	const img56 = await sharp(imageBuffer).resize({ width: 56, height: 56, fit: 'cover' }).toBuffer();

	return {
		full,
		img512,
		img256,
		img128,
		img56
	};
};

export const sanitizeFile = (file: string) => {
	return sanitize(file).replaceAll(/[()\[\]'"!@#$%^&*`]/g, '');
};

/**
 * Remove up to one trailing slash from a URL
 * @param url the URL to sanitize
 * @returns the URL without the last slash
 */
export const removeTrailingSlashes = (url: string) => {
	return url.replace(/\/$/, '');
};

/**
 * Convert a url to a websocket url
 * @param url the url to convert
 * @returns the websocket url
 */
export const convertToWebsocketURL = (url: string) => {
	if (url.endsWith('/')) url = url.substring(0, url.length - 1);
	if (url.startsWith('https')) return 'wss' + url.substring(5);
	else if (url.startsWith('http')) return 'ws' + url.substring(4);
	else return url;
};

// export const dirsSanitizeNested = (dirs: string[]): string => {
//   return '\'"' + dirs.map((d) => sanitize(d)).join('/').replaceAll('\"', '\'').replaceAll('\'', '\'"\'"\'') + '"\'';
// }

// If this is changed, the length of the key must also be changed
const ENC_ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // Bytes

/**
 * Encrypt data using the encryption key stored in the DB
 * @param input the data to encrypt
 * @returns the encrypted data
 */
export const encrypt = async (input: string) => {
	// generate 16 bytes of random data
	const initVector = crypto.randomBytes(16);

	// Get the encryption key, hash it, and make it 32 bytes long
	const key = crypto
		.createHash('sha256')
		.update(String((await settings.get('general.encKey')) + ENC_SALT))
		.digest('base64')
		.substring(0, KEY_LENGTH);

	// Create the cipher
	const cipher = crypto.createCipheriv(ENC_ALGORITHM, key, initVector);

	// encrypt the message
	let encryptedData = cipher.update(input, 'utf-8', 'hex');
	encryptedData += cipher.final('hex');

	// Create and add the header (to store the IV)
	const header = 'UNABRIDGED/' + initVector.toString('hex') + '/';

	// Done
	return header + encryptedData;
};

/**
 * Decrypt the data using the encryption key stored in the DB
 * @param input the data to decrypt
 * @returns the decrypted data
 */
export const decrypt = async (input: string) => {
	// Get the encryption key, hash it, and make it 32 bytes long
	const key = crypto
		.createHash('sha256')
		.update(String((await settings.get('general.encKey')) + ENC_SALT))
		.digest('base64')
		.substring(0, KEY_LENGTH);

	// Split the input into the three parts (UNABRIDGED, IV, Message)
	const inputDecoded = input.split('/');

	// If it isn't the right format, return nothing
	if (inputDecoded.length !== 3) return '';

	// Create the de-cipher
	const decipher = crypto.createDecipheriv(ENC_ALGORITHM, key, Buffer.from(inputDecoded[1], 'hex'));

	// Decode the data
	let decryptedData = decipher.update(inputDecoded[2], 'hex', 'utf-8');
	decryptedData += decipher.final('utf8');

	// Done
	return decryptedData;
};

/**
 * Delay for a number of ms
 * @param ms the number of ms to delay for
 * @returns the promise
 */
export const delay = (ms: number) => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Compress a JSON response based on what compression options the client can accept
 * @param request the client request
 * @param data the data to turn into a JSON file
 * @returns an object with the headers and response data buffer
 */
export const compressJSON = (
	request: Request,
	data: any,
	inputHeaders: { [key: string]: string } = {}
): { headers: { [key: string]: string }; data: Buffer } => {
	// See what encoding we can use
	const encoding = request.headers.get('accept-encoding')?.includes('br')
		? 'br'
		: request.headers.get('accept-encoding')?.includes('gzip')
		? 'gzip'
		: request.headers.get('accept-encoding')?.includes('deflate')
		? 'deflate'
		: 'none';

	// Assign the basic header
	const headers: { [key: string]: string } = {
		'Content-Type': 'application/json'
	};

	// Assign input headers. Content-Type can be overwritten, but length and encoding can't.
	for (const key of Object.keys(inputHeaders)) headers[key] = inputHeaders[key];

	// Add encoding if we are using it
	if (encoding !== 'none') headers['Content-Encoding'] = encoding;

	// Initialize a buffer to hold the resulting data
	let exp: Buffer;

	// Make sure BigInt can be converted to JSON
	BigInt.prototype.toJSON = function () {
		const int = Number.parseInt(this.toString());
		return int ?? this.toString();
	};

	// Convert the data to JSON
	const dataStr = JSON.stringify(data);

	// Encode the data based on what encoding algorithm we are using
	switch (encoding) {
		case 'br':
			exp = zlib.brotliCompressSync(dataStr);
			break;
		case 'gzip':
			exp = zlib.gzipSync(dataStr);
			break;
		case 'deflate':
			exp = zlib.deflateSync(dataStr);
			break;
		default:
			exp = Buffer.from(dataStr, 'utf8');
			break;
	}

	// Assign the content length based on the data result
	headers['Content-Length'] = exp.length.toString();

	// Done!
	return {
		headers,
		data: exp
	};
};

/**
 * Compress a JSON and return a response object
 * @param request the request so we can see what compression to use
 * @param data the data to stringify
 * @returns the response
 */
export const compressJSONResponse = (request: Request, data: any): Response => {
	const d = compressJSON(request, data);
	return new Response(d.data, {
		headers: d.headers
	});
};
