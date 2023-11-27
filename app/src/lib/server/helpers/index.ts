import type { Images } from '$lib/types';
import sharp from 'sharp';
import * as helpers from '$lib/helpers';
import sanitize from 'sanitize-filename';
import * as settings from '$lib/server/settings';
import { ENC_SALT } from '$lib/server/env';
import * as crypto from 'node:crypto';
import * as path from 'node:path';

export const cropImages = async (image: ArrayBuffer): Promise<Images> => {
  const imageBuffer = helpers.toBuffer(image);
  const initial = sharp(imageBuffer);
  const w = (await initial.metadata()).width ?? 0;
  const h = (await initial.metadata()).height ?? 0;
  let full;
  if (w >= h) {
    full = await sharp(imageBuffer).resize({ width: h, height: h, fit: "cover" }).toBuffer();
  } else {
    full = await sharp(imageBuffer).resize({ width: w, height: w, fit: "cover" }).toBuffer();
  }

  const img512 = await sharp(imageBuffer).resize({ width: 512, height: 512, fit: "cover" }).toBuffer();
  const img256 = await sharp(imageBuffer).resize({ width: 256, height: 256, fit: "cover" }).toBuffer();
  const img128 = await sharp(imageBuffer).resize({ width: 128, height: 128, fit: "cover" }).toBuffer();
  const img56 = await sharp(imageBuffer).resize({ width: 56, height: 56, fit: "cover" }).toBuffer();

  return {
    full,
    img512,
    img256,
    img128,
    img56
  }
}

export const sanitizeFile = (file: string) => {
  return sanitize(file).replaceAll(/[()\[\]'"!@#$%^&*`]/g, '');
}

// export const dirsSanitizeNested = (dirs: string[]): string => {
//   return '\'"' + dirs.map((d) => sanitize(d)).join('/').replaceAll('\"', '\'').replaceAll('\'', '\'"\'"\'') + '"\'';
// }

// If this is changed, the length of the key must also be changed
const ENC_ALGORITHM = "aes-256-cbc";
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
  const key = crypto.createHash('sha256').update(String(await settings.get('general.encKey') + ENC_SALT)).digest('base64').substring(0, KEY_LENGTH);

  // Create the cipher
  const cipher = crypto.createCipheriv(ENC_ALGORITHM, key, initVector);

  // encrypt the message
  let encryptedData = cipher.update(input, "utf-8", "hex");
  encryptedData += cipher.final("hex");

  // Create and add the header (to store the IV)
  const header = 'UNABRIDGED/' + initVector.toString('hex') + '/';

  // Done
  return header + encryptedData;
}

/**
 * Decrypt the data using the encryption key stored in the DB
 * @param input the data to decrypt
 * @returns the decrypted data
 */
export const decrypt = async (input: string) => {

  // Get the encryption key, hash it, and make it 32 bytes long
  const key = crypto.createHash('sha256').update(String(await settings.get('general.encKey') + ENC_SALT)).digest('base64').substring(0, KEY_LENGTH);

  // Split the input into the three parts (UNABRIDGED, IV, Message)
  const inputDecoded = input.split('/');

  // If it isn't the right format, return nothing
  if (inputDecoded.length !== 3) return '';

  // Create the de-cipher
  const decipher = crypto.createDecipheriv(ENC_ALGORITHM, key, Buffer.from(inputDecoded[1], "hex"));

  // Decode the data
  let decryptedData = decipher.update(inputDecoded[2], "hex", "utf-8");
  decryptedData += decipher.final("utf8");

  // Done
  return decryptedData;
}