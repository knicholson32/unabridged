import { json } from "@sveltejs/kit";
import type { API } from "..";

/**
 * Export a basic 404 response
 * @returns the 404 response
 */
export const _404 = () => {
  return json({ status: 404, ok: false, message: 'Not found' } satisfies API.Error, { status: 404 });
}

/**
 * Export a basic 400 response
 * @param message override the message
 * @param missingPaths paths that are missing from the request
 * @param missingBodyParams body params that are missing from the JSON body
 * @returns the 400 response
 */
export const _400 = (config: { message?: string, missingPaths?: string[], missingBodyParams?: string[], missingURLParams?: string[]}) => {
  if (config.message !== undefined) return json({ status: 400, ok: false, message: config.message } satisfies API.Error, { status: 400 });
  if (config.missingPaths !== undefined) return json({ status: 400, ok: false, message: 'Missing inputs: ' + config.missingPaths.join(', ') } satisfies API.Error, { status: 400 });
  if (config.missingBodyParams !== undefined) return json({ status: 400, ok: false, message: 'Missing JSON body params: ' + config.missingBodyParams.join(', ') } satisfies API.Error, { status: 400 });
  if (config.missingURLParams !== undefined) return json({ status: 400, ok: false, message: 'Missing URL search params: ' + config.missingURLParams.join(', ') } satisfies API.Error, { status: 400 });
  else return json({ status: 400, ok: false, message: 'Missing inputs'} satisfies API.Error, { status: 400 });
}

/**
 * Export a basic success response
 * @param status the status, otherwise 200
 * @returns the success response
 */
export const success = (opts?: {status?: number, bool?: boolean}) => {
  if (opts !== undefined) {
    const status = opts.status !== undefined ? opts.status : 200;
    if (opts.bool !== undefined)
      return json({ status, ok: true, type: 'boolean', value: opts.bool } satisfies API.Boolean, { status })
  }
  return json({ status: 200, ok: true, type: 'general' } satisfies API.General, { status: 200})
}

/**
 * Export a basic server error response
 * @param error the error object
 * @param context optional context message
 * @returns the server error response
 */
export const serverError = (error: any, context?: string) => {
  if (context !== undefined) return json({ status: 500, ok: false, message: `Server error. Context="${context}" | ${error}` } satisfies API.Error, { status: 500 });
  else return json({ status: 500, ok: false, message: `Server error | ${error}` } satisfies API.Error, { status: 500 });
}