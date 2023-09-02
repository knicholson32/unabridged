<script lang="ts">
	import type { PageNeedsProgress, ProcessProgress, ProcessProgressAPI, ProgressStatus } from "$lib/types";
	import { getContext, onMount } from "svelte";
	import { cubicInOut } from "svelte/easing";
  import type { Readable } from 'svelte/store';

  const progresses = getContext<Readable<ProcessProgress[]>>('progress');
  getContext<PageNeedsProgress>('pageNeedsProgress')();

  type ThemeDefault = 'indigo' | 'white' | 'red' | 'green';

  type Theme = {
    primary?: ThemeDefault
  }

  // Export props
  let clazz: string = '';
	export { clazz as class };
  export let theme: Theme = {};
  export let id: string;

  $: progress = $progresses.find((p) => p.bookAsin === id);

  console.log(progress)


  let themeDefault: ThemeDefault;


  // let interval: number;
  // let isFast: boolean = false;

  // const intervalFunction = async () => {
  //   let progressResp: ProcessProgressAPI = await (await fetch(`/api/progress/${id}`)).json() as ProcessProgressAPI;
  //   if (progressResp.ok === true && progressResp.progress !== undefined) updateProgress(progressResp.progress);
  //   else intervalSlow();
  // }

  // let progress: ProcessProgress | undefined;
  // const updateProgress = (p: ProcessProgress) => {
  //   progress = p;
  //   if (progress.is_done === true) intervalSlow();
  //   else intervalFast();
  // }

  // const intervalSlow = () => {
  //   if (isFast === false) return;
  //   clearInterval(interval);
  //   interval = setInterval(intervalFunction, 3000);
  //   progress = undefined;
  //   isFast = false;
  // }

  // const intervalFast = () => {
  //   if (isFast === true) return;
  //   clearInterval(interval);
  //   interval = setInterval(intervalFunction, 500);
  //   isFast = true;
  // }

  // onMount(() => {
  //   clearInterval(interval);
  //   interval = setInterval(intervalFunction, 3000);
  //   intervalFunction();
  //   return () => clearInterval(interval);
  // });



  if (theme.primary === undefined) themeDefault = 'indigo';
  else themeDefault = theme.primary;


  let themeClassesStatic = '';
  let themeClassesDefault = '';
  let spinnerClasses = '';
  let spinnerProgressClasses = '';

  // rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50
  switch (themeDefault) {
    case 'green':
      themeClassesStatic = '';
      themeClassesDefault = 'bg-green-600 text-white hover:bg-green-500 disabled:text-gray-200 disabled:bg-gray-800 disabled:hover:bg-gray-800 focus-visible:outline-green-500';
      spinnerClasses = 'fill-white text-green-700';
      spinnerProgressClasses = 'text-white';
      break
    case 'red':
      themeClassesStatic = '';
      themeClassesDefault = 'bg-red-600 text-white hover:bg-red-500 disabled:text-gray-200 disabled:bg-gray-800 disabled:hover:bg-gray-800 focus-visible:outline-red-500';
      spinnerClasses = 'fill-white text-red-700';
      spinnerProgressClasses = 'text-white';
      break
    case 'white':
      themeClassesStatic = 'ring-1 ring-inset ring-gray-300'
      themeClassesDefault = 'bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-900 disabled:text-gray-200 disabled:bg-gray-800 disabled:hover:bg-gray-800 focus-visible:outline-grey-500';
      spinnerClasses = 'text-gray-100 fill-gray-800';
      spinnerProgressClasses = 'text-gray-800';
      break
    default: // indigo
      themeClassesStatic = '';
      themeClassesDefault = 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:text-gray-200 disabled:bg-gray-800 disabled:hover:bg-gray-800 focus-visible:outline-indigo-500';
      spinnerClasses = 'fill-white text-indigo-700';
      spinnerProgressClasses = 'text-white';
      break
  }

  let done = false;
  let themeClasses = themeClassesDefault;
  
  let submittingLastState: boolean = false;

  // $: {
  //   if (failed) {
  //     themeClasses = themeClassesFailed;
  //   }
  //   if (!submitting && submittingLastState === true) {
  //     done = true;
  //     if (failed) {
  //       themeClasses = themeClassesFailed;
  //     } else {
  //       themeClasses = themeClassesDone;
  //     }
  //     setTimeout(() => {
  //       done = false;
  //       themeClasses = themeClassesDefault
  //       setTimeout(() => {
  //       }, 200);
  //     }, 3000);
  //   } else if (submitting) {
  //     themeClasses = themeClassesSubmitting;
  //   }
  //   submittingLastState = submitting;
  // } 


  $: circumference = 70 * Math.PI;
  $: offset = circumference - ((progress?.download_progress ?? 0) + (progress?.process_progress ?? 0)) / 2 * circumference

</script>

<div class="{clazz} select-none transition-colors flex justify-center px-3 py-2 rounded-md text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed {(done) ? '' : themeClassesStatic} {themeClasses}">
  <!-- <span class="flex-none"></span> -->
  <div class="relative flex-none ml-2 w-5 h-5 align-middle overflow-hidden">
    {#if progress !== undefined}
      {#if progress.download_progress !== 0 || progress.process_progress !== 0}
        <svg class="absolute w-5 h-5 -rotate-90 {spinnerProgressClasses}" viewBox="-40 -40 80 80">
            <circle stroke-width="7" stroke-dasharray="{circumference}" stroke-dashoffset="{offset}" stroke-linecap="round" stroke="currentColor" fill="transparent" r="35"/>
        </svg>
        <svg aria-hidden="true" class="block w-full h-full {spinnerClasses}" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
        </svg>
        <span class="sr-only">Loading... {Math.floor((progress.download_progress + progress.process_progress) * 50)}%</span>
      {:else}
        <svg aria-hidden="true" class="block w-full h-full animate-spin {spinnerClasses}" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
          <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
        </svg>
        <span class="sr-only">Loading...</span>
      {/if}
    {/if}
  </div>
</div>