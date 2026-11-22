<!-- Shown in place of a download button for a book that Audible lets none of its accounts download -->
<script lang="ts">
	/** Shorter text, for narrow places */
	export let short = false;
</script>

<span
	class="inline-flex items-center whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 cursor-help"
	title="Audible does not let any account with this book download it. This usually means it came from a catalog such as Audible Plus and that access has ended. If you buy it, it can be downloaded after the account's next sync."
	>{short ? 'Unavailable' : 'Not downloadable'}</span
>
