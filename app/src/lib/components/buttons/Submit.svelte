<script lang="ts">
	import { cubicInOut } from "svelte/easing";

  type ThemeDefault = 'indigo' | 'white' | 'red' | 'green';
  type ThemeDone = 'green' | 'white';
  type ThemeFail = 'red' | 'yellow';

  type Theme = {
    primary?: ThemeDefault,
    done?: ThemeDone,
    fail?: ThemeFail 
  }

  // Export props
  let clazz: string = '';
	export { clazz as class };
  export let submitting: boolean;
  export let failed: boolean = false;
  export let progress: number = 0;

  export let disabled: boolean = false;
  export let actionText = 'Save';
  export let actionTextInProgress = 'Saving';
  export let doneText = 'Done';
  export let failedText = 'Failed';
  export let skipDoneMessage = false;
  export let skipLoadingSpinner = false;

  

  export let theme: Theme = {};

  let themeDefault: ThemeDefault;
  if (theme.primary === undefined) themeDefault = 'indigo';
  else themeDefault = theme.primary;

  let themeDone: ThemeDone;
  if (theme.done === undefined) themeDone = 'green';
  else themeDone = theme.done;

  let themeFailed: ThemeFail;
  if (theme.fail === undefined) themeFailed = 'red';
  else themeFailed = theme.fail;


  let themeClassesStatic = '';
  let themeClassesDefault = '';
  let themeClassesSubmitting = '';
  let themeClassesDone = '';
  let themeClassesFailed = '';
  let spinnerClasses = '';
  let spinnerProgressClasses = '';

  // rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50
  switch (themeDefault) {
    case 'green':
      themeClassesStatic = '';
      themeClassesDefault = 'bg-green-600 text-white hover:bg-green-500 disabled:text-gray-200 disabled:bg-gray-800 disabled:hover:bg-gray-800 focus-visible:outline-green-500';
      themeClassesSubmitting = 'bg-green-600 text-white cursor-default';
      spinnerClasses = 'fill-white text-green-700';
      spinnerProgressClasses = 'text-white';
      break
    case 'red':
      themeClassesStatic = '';
      themeClassesDefault = 'bg-red-600 text-white hover:bg-red-500 disabled:text-gray-200 disabled:bg-gray-800 disabled:hover:bg-gray-800 focus-visible:outline-red-500';
      themeClassesSubmitting = 'bg-red-600 text-white cursor-default';
      spinnerClasses = 'fill-white text-red-700';
      spinnerProgressClasses = 'text-white';
      break
    case 'white':
      themeClassesStatic = 'ring-1 ring-inset ring-gray-300'
      themeClassesDefault = 'bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-900 disabled:text-gray-200 disabled:bg-gray-800 disabled:hover:bg-gray-800 focus-visible:outline-grey-500';
      themeClassesSubmitting = 'bg-white text-gray-800 cursor-default';
      spinnerClasses = 'text-gray-100 fill-gray-800';
      spinnerProgressClasses = 'text-gray-800';
      break
    default: // indigo
      themeClassesStatic = '';
      themeClassesDefault = 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:text-gray-200 disabled:bg-gray-800 disabled:hover:bg-gray-800 focus-visible:outline-indigo-500';
      themeClassesSubmitting = 'bg-indigo-600 text-white cursor-default';
      spinnerClasses = 'fill-white text-indigo-700';
      spinnerProgressClasses = 'text-white';
      break
  }

  switch (themeDone) {
    case 'white':
      themeClassesDone = 'bg-white text-gray-800 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-grey-500 ring-1 ring-inset ring-gray-300';
      break;
    default: // green
      themeClassesDone = 'bg-green-600 text-white hover:bg-green-500 focus-visible:outline-green-500';
      break;
  }

  switch (themeFailed) {
    case 'yellow':
      themeClassesFailed = 'bg-yellow-500 text-white hover:bg-yellow-400 focus-visible:outline-yellow-500';
      break;
    default: // red
      themeClassesFailed = 'bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-500';
      break;
  }

  let done = false;
  let themeClasses = themeClassesDefault;
  
  let submittingLastState: boolean = false;

  $: {
    if (failed) {
      themeClasses = themeClassesFailed;
    }
    if (!submitting && submittingLastState === true) {
      done = true;
      if (failed) {
        themeClasses = themeClassesFailed;
      } else {
        themeClasses = themeClassesDone;
      }
      setTimeout(() => {
        done = false;
        themeClasses = themeClassesDefault
        setTimeout(() => {
        }, 200);
      }, 3000);
    } else if (submitting) {
      themeClasses = themeClassesSubmitting;
    }
    submittingLastState = submitting;
  } 

  let button: HTMLButtonElement;
  export const click = () => {
    button.click();
  }

  export const disable = (shouldDisable: boolean) => disabled = shouldDisable;


  const reveal = (node: HTMLElement) => {
    return {
        delay: 0,
        duration: 200,
        easing: cubicInOut,
        css: (t: number) => `
			    max-width: ${t * (0.5 + 1.25)}rem;
        `
    };
  };

  $: circumference = 70 * Math.PI;
  $: offset = circumference - progress * circumference
  // stroke-dasharray="{circumference}" stroke-dashoffset="{offset}" 

</script>

<button title="{submitting && progress != 0 ? `${Math.round(progress * 100)}%` : ''}" bind:this={button} disabled={disabled} type="submit" class="{clazz} select-none transition-colors flex justify-center px-3 py-2 rounded-md text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed {(done) ? '' : themeClassesStatic} {themeClasses}">
  <span class="flex-none">{done ? (failed ? failedText : doneText) : (submitting ? actionTextInProgress : actionText)}</span>
  {#if submitting || done}
    <div transition:reveal role="status" class="relative flex-none ml-2 w-5 h-5 align-middle overflow-hidden">
      {#if done && !failed && !skipDoneMessage}
        <svg aria-hidden="true" class="block w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
        </svg>
        <span class="sr-only">Done</span>
      {:else if done && failed}
        <svg aria-hidden="true" class="block w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
        <span class="sr-only">Failed</span>
      {:else if submitting && progress != 0}
        <svg class="absolute w-5 h-5 -rotate-90 {spinnerProgressClasses}" viewBox="-40 -40 80 80">
            <circle stroke-width="7" stroke-dasharray="{circumference}" stroke-dashoffset="{offset}" stroke-linecap="round" stroke="currentColor" fill="transparent" r="35"/>
        </svg>
        <svg aria-hidden="true" class="block w-full h-full {spinnerClasses}" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
        </svg>
        <span class="sr-only">Loading... {Math.floor(progress * 100)}%</span>
      {:else if submitting && !skipLoadingSpinner}
        <svg aria-hidden="true" class="block w-full h-full animate-spin {spinnerClasses}" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
          <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
        </svg>
        <span class="sr-only">Loading...</span>
      {/if}
    </div>
  {/if}
</button>


<!-- <div class="grid grid-cols-3 auto-rows-max gap-1 w-fit">
  <Submit theme={'indigo'} submitting={false} actionText={"Indigo"} actionTextInProgress={"Indigo"}/>
  <Submit theme={'indigo'} submitting={true} actionText={"Indigo"} actionTextInProgress={"Indigo"}/>
  <Submit theme={'indigo'} submitting={false} done={true} actionText={"White"} actionTextInProgress={"White"}/>
  <Submit theme={'white'} submitting={false} actionText={"White"} actionTextInProgress={"White"}/>
  <Submit theme={'white'} submitting={true} actionText={"White"} actionTextInProgress={"White"}/>
  <Submit theme={'white'} submitting={false} done={true} actionText={"White"} actionTextInProgress={"White"}/>
  <Submit theme={'red'} submitting={false} actionText={"Red"} actionTextInProgress={"Red"}/>
  <Submit theme={'red'} submitting={true} actionText={"Red"} actionTextInProgress={"Red"}/>
  <Submit theme={'red'} submitting={false} done={true} actionText={"Red"} actionTextInProgress={"Red"}/>
  <Submit submitting={false} done={true} failed={true} themeFailed={'red'} actionText={"White"} actionTextInProgress={"White"}/>
  <Submit submitting={false} done={true} failed={true} themeFailed={'red'} actionText={"White"} actionTextInProgress={"White"}/>
  <Submit submitting={false} done={true} failed={true} themeFailed={'yellow'} actionText={"White"} actionTextInProgress={"White"}/>
</div> -->