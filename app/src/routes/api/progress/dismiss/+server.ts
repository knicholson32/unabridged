// Delete the done ones now that we have them
import prisma from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import type { ProcessProgressesAPI } from '$lib/types';

export const GET = async ({}) => {
  console.log('DELETE QUEUES');
  await prisma.processQueue.deleteMany({ where: { is_done: true, in_progress: false } });
  // Return
  return json({ ok: true, status: 200 } satisfies ProcessProgressesAPI);
}