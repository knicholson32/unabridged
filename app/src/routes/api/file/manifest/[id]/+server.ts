import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import { clean } from '$lib/server/media';


export const GET = async ({ params }) => {
  const id = params.id;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) throw error(404, 'Not found');

  // Clean the files that are hanging
  await clean();

  // Get the profile from the database
  const files = await prisma.media.findMany({ 
    where: { bookAsin: id },
    select: {
      id: true,
      content_type: true,
      extension: true,
      title: true,
      bookAsin: true,
      data: false,
      path: false,
      size_b: true,
      description: true
    }
  });

  // Return if the profile was not found
  if (files === null || files === undefined) throw error(404, 'Not found');

  // Done
  return json({ status: 'ok', files });
}

