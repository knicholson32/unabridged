import prisma from '$lib/server/prisma';
import { API } from '$lib/types';
import { json } from '@sveltejs/kit';


export const GET = async ({ setHeaders, params }) => {
  const id = params.id;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) return API.response._400({ missingPaths: ['id'] });

  // Get the profile from the database
  const image = await prisma.profileImage.findUnique({ where: { id } });

  // Return if the profile was not found
  if (image === null || image === undefined) return API.response._404();

  try {
    setHeaders({
      'Content-Type': image.content_type,
      'Content-Length': image.full.length.toString()
    });
    return new Response(image.full);
  } catch (e) {
    return API.response.serverError(e);
  }
}