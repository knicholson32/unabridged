import type { Images } from '$lib/types';
import sharp from 'sharp';
import * as helpers from '$lib/helpers';
import sanitize from 'sanitize-filename';
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