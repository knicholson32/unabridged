import prisma from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import { clean } from '$lib/server/media';
import { API } from '$lib/types';


export const GET = async ({ params }) => {
  const id = params.id;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) return json({ status: 400, ok: false, message: 'No ID' } satisfies API.Error, { status: 400 });

  // Clean the files that are hanging
  await clean();

  // Get the profile from the database
  const files: API.Types.File[] = await prisma.media.findMany({
    ...{ where: { bookAsin: id }},
    ...{ select: API.Tools.fileSelect }
  });

  // Return if the profile was not found
  if (files === null || files === undefined) return json({ status: 404, ok: false, message: 'Not Found'} satisfies API.Error, { status: 404 });

  // Done
  return json({ status: 200, ok: true, files, type: 'manifest' } satisfies API.Manifest);
}

