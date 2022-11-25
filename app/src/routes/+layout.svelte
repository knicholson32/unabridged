<script lang="ts">
    import '../app.css';
    import { page } from '$app/stores';

    import type { PageData } from './$types';

    export let data: PageData;

</script>


<div class="flex flex-row h-screen overflow-hidden">
    <div class="flex flex-col flex-none w-1/5 max-w-xs min-w-fit bg-slate-800">
        <div class="flex-none w-full">
            <img class="mx-auto py-4 w-7/12" src="https://m.media-amazon.com/images/G/01/audibleweb/arya/navigation/audible_logo_inverse._V517446980_.svg" alt="Audible Logo"/>
        </div>
        <div class="flex-none mx-4 px-2 rounded-md h-fit bg-slate-500 inline">
            <svg class="w-5 h-5 inline stroke-slate-200 my-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            <div class="inline align-middle ml-2 font-sans font-thin text-slate-200">{$page.url.pathname}{JSON.stringify(data)}</div>
        </div>
        <div class="flex-1 w-full basis-20 content-center"></div>
        <div class="flex-none w-full h-fit text-center text-slate-500 text-sm my-1">® 2022 Entalon, LLC</div>
    </div>
    <div class="flex-1 overflow-y-auto px-2">
        <slot />
    </div>
</div>