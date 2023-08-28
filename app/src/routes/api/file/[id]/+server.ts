import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import * as helpers from '$lib/helpers';
import * as fs from 'node:fs';
import { MEDIA_FOLDER } from '$env/static/private';
import type { NotificationAPI, Notification, ModalTheme, Issuer } from '$lib/types';


export const GET = async ({ setHeaders, params }) => {
  const id = params.id;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) throw error(404, 'Not found');

  // Get the profile from the database
  const file = await prisma.media.findUnique({ where: { id } });

  // Return if the profile was not found
  if (file === null || file === undefined) throw error(404, 'Not found');

  const filePath = `${MEDIA_FOLDER}/${id}`;
  const stat = fs.statSync(filePath);
  const readStream = fs.createReadStream(filePath);

  try {
    setHeaders({
      'Content-Type': 'application/octet-stream',
      "Content-Disposition": `attachment; filename=${file.title}.${file.extension}`,
      'Content-Length': stat.size.toString()
    });
    // NOTE: This is NOT a correct typecast. This works, but typescript doesn't agree.
    // https://kit.svelte.dev/docs/routing#server
    return new Response(readStream as unknown as string);
  } catch (e) {
    throw error(500, "Internal server error")
  }
}

