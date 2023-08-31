import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import * as helpers from '$lib/helpers';
import type { ProgressManyAPI, ProgressStatus } from '$lib/types';

export const GET = async ({ params }) => {

  const id = params.id;

  // Check that the ID was actually submitted
  if (id === null || id === undefined) throw error(404, 'Not found');

  const progress = await prisma.progress.findMany({
    where: { id },
    select: {
      id: false,
      type: true,
      progress: true,
      status: true,
      message: true,
      ref: true,
      speed_mb_s: true,
      total_mb: true,
      downloaded_mb: true
    }
  });

  // Return if the profile was not found
  if (progress === null || progress === undefined) return json({ ok: false, status: 404 } satisfies ProgressManyAPI)

  // Delete this progress if it is done
  await prisma.progress.deleteMany({
    where: { 
      AND: [
        { id: { equals: id } },
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