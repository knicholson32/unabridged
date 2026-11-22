import type { ActionResult } from '@sveltejs/kit';
import type { GenerateAlert } from '$lib/types';

/**
 * Report a form submission that never got a response from its action: the server rejected it
 * (for example the cross-site check in hooks.server.ts) or the action crashed. Without this the
 * form looks like it worked, because `update()` is called whatever the result.
 * @param result the result passed to the `use:enhance` callback
 * @param showAlert the page's alert function
 * @param what what was being done, for the alert title ("Saving", "Refresh Login", ...)
 * @returns true if the submission failed, in which case the caller should not call `update()`
 */
export const reportFormError = (
	result: ActionResult,
	showAlert: GenerateAlert | undefined,
	what: string
): boolean => {
	if (result.type !== 'error') return false;
	const err = result.error as unknown;
	console.error(`${what} failed`, err);
	// A response that is not an action result (e.g. a plain-text 403) cannot be parsed
	const detail =
		err instanceof SyntaxError
			? 'The server rejected the request. Check the Unabridged log for the reason.'
			: err instanceof Error
			? err.message
			: typeof err === 'object' && err !== null && 'message' in err
			? String((err as { message: unknown }).message)
			: 'The server did not complete the request. Check the Unabridged log.';
	showAlert?.(`${what} failed`, { subText: detail, theme: 'error' });
	return true;
};
