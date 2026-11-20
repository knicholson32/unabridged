<script lang="ts">
	// Status-bar indicator for Audiobookshelf scans: a countdown while one is scheduled, a spinner
	// while it runs, then the result for a few seconds.
	import { onDestroy, onMount } from 'svelte';
	import * as events from '$lib/events';
	import { Event } from '$lib/types';
	import { LoadingCircle } from '$lib/components/decorations';

	/** When the next scan runs (unix seconds), or -1 */
	export let scheduled: number;

	enum States {
		IDLE,
		SCHEDULED,
		PROGRESS,
		RESULT
	}

	let state = States.IDLE;
	let countDown = '';
	let progress = 0;
	let success = true;
	let message = '';
	let interval: ReturnType<typeof setInterval> | undefined;
	let timeout: ReturnType<typeof setTimeout> | undefined;

	const tick = () => {
		if (scheduled === -1) return;
		const remaining = scheduled - Math.floor(Date.now() / 1000);
		countDown = remaining < 0 ? '' : remaining.toString();
	};

	$: {
		if (state === States.IDLE && scheduled !== -1) {
			state = States.SCHEDULED;
			tick();
			clearInterval(interval);
			interval = setInterval(tick, 1000);
		} else if (state === States.SCHEDULED && scheduled === -1) {
			// Cancelled (e.g. more books started processing)
			clearInterval(interval);
			state = States.IDLE;
		}
	}

	const showResult = (ok: boolean, text: string) => {
		state = States.RESULT;
		success = ok;
		message = text;
		clearInterval(interval);
		clearTimeout(timeout);
		timeout = setTimeout(() => (state = States.IDLE), 5000);
	};

	let destroy: () => void = () => {};
	onDestroy(() => destroy());

	onMount(() => {
		const progressRemove = events.onProgress('basic.abs.scan', null, (id, data) => {
			clearInterval(interval);
			countDown = '';
			switch (data.t) {
				case Event.Progress.Basic.Stage.START:
					state = States.PROGRESS;
					progress = 0;
					break;
				case Event.Progress.Basic.Stage.IN_PROGRESS:
					state = States.PROGRESS;
					progress = data.p;
					break;
				case Event.Progress.Basic.Stage.DONE:
					showResult(data.success, data.m ?? '');
					break;
			}
		});
		const resultRemove = events.on('abs.scan.result', (data) => {
			if (data !== null) showResult(data.success, data.message);
		});
		destroy = () => {
			clearInterval(interval);
			clearTimeout(timeout);
			progressRemove();
			resultRemove();
		};
		return destroy;
	});
</script>

<div class="flex flex-col justify-center">
	{#if state === States.SCHEDULED}
		{#if countDown !== ''}
			<span class="text-xxs font-mono align-middle" title="Audiobookshelf library scan">
				ABS scan in {countDown}
			</span>
		{/if}
	{:else if state === States.PROGRESS}
		<div
			class="shrink-0 text-xxs border border-gray-400 bg-white text-gray-800 rounded-md pl-2 flex items-center gap-1 truncate overflow-hidden"
			title="Audiobookshelf is scanning the library"
		>
			Scanning
			<div class="transition-colors duration-100 p-0.5 bg-white text-white">
				<LoadingCircle {progress} spin={true} theme={{ primary: 'white' }} spinnerOnly={true} />
			</div>
		</div>
	{:else if state === States.RESULT}
		<div
			title={message}
			class="shrink-0 h-7 text-xxs border {success
				? 'border-gray-400 text-gray-800'
				: 'border-red-600 text-red-600'} bg-white rounded-md px-2 flex items-center gap-1 truncate overflow-hidden"
		>
			{success ? 'ABS scan ✓' : 'ABS scan failed'}
		</div>
	{/if}
</div>
