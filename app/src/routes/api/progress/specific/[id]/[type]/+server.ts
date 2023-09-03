import prisma from '$lib/server/prisma';
import { error, json } from '@sveltejs/kit';
import * as helpers from '$lib/helpers';
import type { ProgressAPI, ProgressStatus } from '$lib/types';

export const GET = async ({ params }) => {

  const id = params.id;
  const type = params.type;

  // Check that the ID was actually submitted
  if (id === null || id === undefined || type === null || type === undefined) throw error(404, 'Not found');

  const progress = await prisma.progress.findUnique({
    where: { 
      id_type: {
        id,
        type
      }
    },
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
  if (progress === null || progress === undefined) return json({ ok: false, status: 404 } satisfies ProgressAPI)

  // Delete this progress if it is done
  if (progress.status === 'DONE' satisfies ProgressStatus || progress.status === 'ERROR' satisfies ProgressStatus) {
    console.log('DELETE', progress);
    await prisma.progress.delete({ where: { id_type: { id, type } } });
  }

  return json({ ok: true, progress: progress, status: 200 } satisfies ProgressAPI);
}