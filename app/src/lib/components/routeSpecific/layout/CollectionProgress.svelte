<script lang="ts">
	import { onDestroy, onMount } from "svelte";
  import * as events from '$lib/events';
	import { Event, ScanAndGenerate, scanAndGenerateToStringLong, scanAndGenerateToStringShort } from "$lib/types";
	import { LoadingCircle } from "$lib/components/decorations";


  export let scheduled: number;

  enum States {
    IDLE,
    SCHEDULED,
    PROGRESS,
    RESULT
  }

  let scheduledCountDown = '';

  let state = States.IDLE;

  let interval: number;
  let timeout: number;

  let progress: number = 0;
  let spin: boolean = true;
  let result: ScanAndGenerate = ScanAndGenerate.NO_ERROR;


  $: {
    if (state === States.IDLE) {
      progress = 0;
      spin = false;
      result = ScanAndGenerate.NO_ERROR;
      if (scheduled !== -1) {
        state = States.SCHEDULED;
        interval = setInterval(regular, 1000);
      }
    }
  }

  const regular = () => {
    if (scheduled !== -1) {
      const v = -(Math.floor(Date.now() / 1000) - scheduled);
      if (v < 0) {
        scheduledCountDown = '';
      } else {
        scheduledCountDown = v.toString();
      }
    }
  }

  let destroy: () => void = () => {};
  onDestroy(destroy);
  onMount(() => {
    const progressRemove = events.onProgress('basic.collection.scan', null, (id, data) => {
      state = States.PROGRESS;
      scheduledCountDown = '';
      clearInterval(interval);
      switch (data.t) {
        case Event.Progress.Basic.Stage.START:
          progress = 0;
          // spin = false;
          result = ScanAndGenerate.NO_ERROR;;
          break;
        case Event.Progress.Basic.Stage.IN_PROGRESS:
          progress = data.p;
          // spin = false;
          break;
        case Event.Progress.Basic.Stage.DONE:
          progress = 1;
          // spin = false;
          state = States.RESULT;
          result = data.data as ScanAndGenerate;
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            state = States.IDLE;
          }, 5000);
          break;
      }
    });
    const resultRemove = events.on('collection.result', (data) => {
      if (data !== null) {
        state = States.RESULT;
        result = data;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          state = States.IDLE;
        }, 5000);
      }
    });
    destroy = () => {
      clearInterval(interval);
      clearTimeout(timeout);
      progressRemove();
      resultRemove();
    }
    return destroy;
  })


</script>


<div class="flex flex-col justify-center">

  {#if state === States.SCHEDULED}
    {#if scheduledCountDown !== ''}
      <span class="text-xxs font-mono align-middle">Auto-Scan in {scheduledCountDown}</span>
    {/if}
  {:else if state === States.PROGRESS}
    <!-- <div class="shrink-0 text-xxs border border-gray-800 bg-gray-700 text-white rounded-md pl-2 flex items-center gap-2 truncate overflow-hidden"> -->
    <div class="shrink-0 text-xxs border border-gray-400 bg-white text-gray-800 rounded-md pl-2 flex items-center gap-1 truncate overflow-hidden">
      Collecting
      <div class="transition-colors duration-100 p-0.5 bg-white text-white" >
        <LoadingCircle progress={progress} spin={spin} theme={{primary: 'white'}} spinnerOnly={true} />
      </div>
    </div>
  {:else if state === States.RESULT}
    {#if result === ScanAndGenerate.NO_ERROR || result === ScanAndGenerate.NO_ERROR_COLLECTIONS_DISABLED}
      <div title={scanAndGenerateToStringLong(result)} class="shrink-0 h-7 text-xxs border border-gray-400 bg-white text-gray-800 rounded-md px-2 flex items-center gap-1 truncate overflow-hidden">
        {scanAndGenerateToStringShort(result)} ✓
      </div>
    {:else}
      <div title={scanAndGenerateToStringLong(result)} class="shrink-0 h-7 text-xxs border border-red-600 bg-white text-red-600 rounded-md px-2 flex items-center gap-1 truncate overflow-hidden">
        Error: {scanAndGenerateToStringShort(result)}
      </div>
    {/if}
  {/if}

</div>
