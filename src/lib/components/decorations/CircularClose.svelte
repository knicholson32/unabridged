<script lang="ts">
    export let value: number;
    $: circumference = 60 * Math.PI;
    $: offset = circumference - value * circumference
</script>

<button on:click type="button" class="group inline-flex rounded-md text-black/30 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
    <div class="inline-flex relative h-5 w-5 items-center justify-center">
        <svg class="absolute w-8 h-8 -rotate-90 text-black/10 group-hover:opacity-0" viewBox="-40 -40 80 80">
            <!-- <circle class="text-gray-100" stroke-width="10" stroke="currentColor" fill="transparent" r="30"/> -->
            <circle stroke-width="5" stroke-dasharray="{circumference}" stroke-dashoffset="{offset}" stroke-linecap="round" stroke="currentColor" fill="transparent" r="30" />
        </svg>
        <svg class="absolute h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
    </div>
    <span class="sr-only">Close</span>
</button>