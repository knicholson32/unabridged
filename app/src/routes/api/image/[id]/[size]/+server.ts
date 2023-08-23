import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import * as helpers from '$lib/helpers';
import type { NotificationAPI, Notification, ModalTheme, Issuer } from '$lib/types';


export const GET = async ({ setHeaders, params }) => {
  const id = params.id;
  const size = params.size;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) throw error(404, 'Not found');

  // Get the profile from the database
  const image = await prisma.profileImage.findUnique({ where: { id } });

  // Return if the profile was not found
  if (image === null || image === undefined) throw error(404, 'Not found');

  let exp: Buffer;
  
  switch (size) {
    case '512':
      exp = image.i512;
      break;
    case '256':
      exp = image.i256;
      break;
    case '128':
      exp = image.i128;
      break;
    case '56':
      exp = image.i56;
      break;
    default:
      exp = image.full;
      break;
  }

  try {
    setHeaders({
      'Content-Type': image.content_type,
      'Content-Length': exp.length.toString()
    });
    return new Response(exp);
  } catch (e) {
    throw error(500, "Internal server error")
  }
}