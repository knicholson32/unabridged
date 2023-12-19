import prisma from '$lib/server/prisma';
import { API, ProcessType } from '$lib/types';
import { compressJSONResponse } from '$lib/server/helpers';
import { getSet } from '$lib/server/settings';

export const GET = async ({ request, setHeaders }) => {

  const processes: API.Types.ProcessQueueBOOK[] = await prisma.processQueue.findMany({ include: API.Tools.processQueueBOOKInclude, where: { type: ProcessType.BOOK } });

  // Convert the BigInt variable to a number so it can be converted to JSON
  for (const p of processes) if (p.try_after_time !== null) p.try_after_time = Number(p.try_after_time) as unknown as bigint;

  const settings = await getSet('progress');

  return compressJSONResponse(request, { ok: true, processes: processes, settings, status: 200, type: 'process.book' } satisfies API.Process.Book);
}