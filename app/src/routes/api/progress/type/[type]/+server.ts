import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import * as helpers from '$lib/helpers';
import type { ProgressManyAPI, ProgressStatus } from '$lib/types';

export const GET = async ({ params }) => {

  const type = params.type;

  // Check that the ID was actually submitted
  if (type === null || type === undefined) throw error(404, 'Not found');

  const progress = await prisma.progress.findMany({
    where: { type },
    select: {
      id: false,
      type: true,
      progress: true,
      status: true,
      message: true,
      ref: true,
    }
  });

  // Return if the profile was not found
  if (progress === null || progress === undefined) return json({ ok: false, status: 404 } satisfies ProgressManyAPI)

  // Delete this progress if it is done
  await prisma.progress.deleteMany({
    where: { 
      AND: [
        { type: { equals: type } },
        {
          OR: [
            { status: { equals: 'DONE' } },
            { status: { equals: 'ERROR' } }
          ]
        }
      ]
    }
  })

  return json({ ok: true, progress: progress, status: 200 } satisfies ProgressManyAPI);
}