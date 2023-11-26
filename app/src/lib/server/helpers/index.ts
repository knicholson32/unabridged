import type { Images } from '$lib/types';
import sharp from 'sharp';
import * as helpers from '$lib/helpers';
import sanitize from 'sanitize-filename';
import * as settings from '$lib/server/settings';
import { ENC_SALT } from '$lib/server/env';
import * as CryptoJS from 'crypto-js';
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


export const toWordArray = (str: string): CryptoJS.lib.WordArray => {
  return CryptoJS.enc.Utf8.parse(str);
}

export const toString = (words: CryptoJS.lib.WordArray): string => {
  return CryptoJS.enc.Utf8.stringify(words);
}

export const toBase64String = (words: CryptoJS.lib.WordArray): string => {
  return CryptoJS.enc.Base64.stringify(words);
}

export const hash = async (string: string): Promise<string> => {
  const utf8 = new TextEncoder().encode(string);
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((bytes) => bytes.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

// DO NOT CHANGE THE LENGTH OF THIS HEADER (bit alignment issues)
const HEADER_ENCRYPT = '_UNABRIDGED_ENC';

export const encrypt = async (input: string) => {

  // Get the symmetric key
  const key = await hash(await settings.get('general.encKey') + ENC_SALT);

  const PROTOCOL_AES256 = 2;
  const secret_key = CryptoJS.SHA256(key);
  const header = toWordArray(HEADER_ENCRYPT + String.fromCharCode(PROTOCOL_AES256));
  const iv = CryptoJS.lib.WordArray.random(16);
  const body = CryptoJS.AES.encrypt(input, secret_key, { iv: iv });

  // construct the packet
  // HEADER + IV + BODY
  header.concat(iv);
  header.concat(body.ciphertext);

  // encode in base64
  return toBase64String(header);
}

export const decrypt = async (input: string) => {

  // Get the symmetric key
  const key = await hash(await settings.get('general.encKey') + ENC_SALT);

  // convert payload encoded in base64 to words
  const packet = CryptoJS.enc.Base64.parse(input);

  // helpers to compute for offsets
  const PROTOCOL_AES256 = 2;
  const secret_key = CryptoJS.SHA256(key);
  const header = toWordArray(HEADER_ENCRYPT + String.fromCharCode(PROTOCOL_AES256));
  const iv = CryptoJS.lib.WordArray.random(16);

  // compute for offsets
  const start = iv.words.length + header.words.length;

  const cipherText = CryptoJS.lib.WordArray.create(packet.words.slice(start));
  const parsed_iv = CryptoJS.lib.WordArray.create(packet.words.slice(header.words.length, start));
  const cipherTextStr = toBase64String(cipherText);
  const decrypted = CryptoJS.AES.decrypt(cipherTextStr, secret_key, { iv: parsed_iv });

  return toString(decrypted);
}