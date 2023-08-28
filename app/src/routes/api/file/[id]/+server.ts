import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import * as helpers from '$lib/helpers';
import * as fs from 'node:fs';
import { MEDIA_FOLDER } from '$env/static/private';
import type { NotificationAPI, Notification, ModalTheme, Issuer } from '$lib/types';


export const GET = async ({ setHeaders, params, url }) => {
  const id = params.id;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) throw error(404, 'Not found');

  // Get the profile from the database
  const file = await prisma.media.findUnique({ where: { id } });

  // Return if the profile was not found
  if (file === null || file === undefined) throw error(404, 'Not found');

  // Make this an attachment if specified
  const attachment = url.searchParams.get('attachment') !== null;

  // Check if the data is stored in the DB
  if (file.data === null) {
    // The data is stored in a file
    const filePath = `${MEDIA_FOLDER}/${id}`;
    const stat = fs.statSync(filePath);
    const readStream = fs.createReadStream(filePath);

    try {
      if (attachment) {
        setHeaders({
          'Content-Type': 'application/octet-stream',
          "Content-Disposition": `attachment; filename=${file.title}.${file.extension}`,
          'Content-Length': stat.size.toString()
        });
      } else {
        setHeaders({
          'Content-Type': file.content_type,
          "Content-Disposition": `filename=${file.title}.${file.extension}`,
          'Content-Length': stat.size.toString()
        });
      }
      // NOTE: This is NOT a correct typecast. This works, but typescript doesn't agree.
      // https://kit.svelte.dev/docs/routing#server
      return new Response(readStream as unknown as string);
    } catch (e) {
      throw error(500, "Internal server error")
    }
  } else {
    // The data is stored in the DB
    const fileData = file.data;

    try {
      if (attachment) {
        setHeaders({
          'Content-Type': 'application/octet-stream',
          "Content-Disposition": `attachment; filename=${file.title}.${file.extension}`,
          'Content-Length': fileData.length.toString()
        });
      } else {
        setHeaders({
          'Content-Type': file.content_type,
          "Content-Disposition": `filename=${file.title}.${file.extension}`,
          'Content-Length': fileData.length.toString()
        });
      }
      // NOTE: This is NOT a correct typecast. This works, but typescript doesn't agree.
      // https://kit.svelte.dev/docs/routing#server
      return new Response(fileData);
    } catch (e) {
      throw error(500, "Internal server error")
    }
  }
}

