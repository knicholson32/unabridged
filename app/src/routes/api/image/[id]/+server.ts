import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import * as helpers from '$lib/helpers';
import type { NotificationAPI, Notification, ModalTheme, Issuer } from '$lib/types';


export const GET = async ({ setHeaders, params }) => {
  const id = params.id;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) throw error(404, 'Not found');

  // Get the profile from the database
  const image = await prisma.profileImage.findUnique({ where: { id } });

  // Return if the profile was not found
  if (image === null || image === undefined) throw error(404, 'Not found');

  try {
    setHeaders({
      'Content-Type': image.content_type,
      'Content-Length': image.full.length.toString()
    });
    return new Response(image.full);
  } catch (e) {
    throw error(500, "Internal server error")
  }
}