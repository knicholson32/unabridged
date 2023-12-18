import prisma from '$lib/server/prisma';
import { json } from '@sveltejs/kit';
import { API, type ProcessQueueBOOK, processQueueBOOKInclude, ProcessType } from '$lib/types';
import { compressJSON } from '$lib/server/helpers';

export const GET = async ({ request, setHeaders }) => {

  const processes: ProcessQueueBOOK[] = await prisma.processQueue.findMany({ include: processQueueBOOKInclude, where: { type: ProcessType.BOOK } });

  // Convert the BigInt variable to a number so it can be converted to JSON
  for (const p of processes) if (p.try_after_time !== null) p.try_after_time = Number(p.try_after_time) as unknown as bigint;

  
  const resp = compressJSON(request, { ok: true, processes: processes, status: 200, type: 'process.book' } satisfies API.Process.Book);

  setHeaders(resp.headers);
  return new Response(resp.data);
}