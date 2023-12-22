<script lang="ts">
	import { v4 as uuidv4 } from 'uuid';
	export let fillPercentage: number;
	export let fillColor = '#000000';
	export let unfilledColor = '#000000';

	const uuid = uuidv4();
</script>

<svg
	class="w-3"
	xmlns="http://www.w3.org/2000/svg"
	id="star"
	x="0"
	y="0"
	version="1.1"
	viewBox="0 0 29 29"
	xml:space="preserve"
>
	<defs>
		<linearGradient id="linear-gradient-{uuid}" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" style="stop-color:{fillColor};stop-opacity:0.7" />
			<stop offset="{fillPercentage * 100}%" style="stop-color:{fillColor};stop-opacity:0.7" />
			<stop offset="{fillPercentage * 100}%" style="stop-color:{unfilledColor};stop-opacity:0.1" />
		</linearGradient>
	</defs>
	<path
		fill="url(#linear-gradient-{uuid})"
		d="m15.397 4.687 2.579 5.225a1 1 0 0 0 .753.547l5.766.838a1 1 0 0 1 .554 1.706l-4.173 4.067c-.236.23-.343.561-.288.885l.985 5.743a1 1 0 0 1-1.451 1.054l-5.158-2.712a1.002 1.002 0 0 0-.931 0l-5.158 2.712a1 1 0 0 1-1.451-1.054l.985-5.743a.999.999 0 0 0-.288-.885l-4.173-4.067a1 1 0 0 1 .554-1.706l5.766-.838a1 1 0 0 0 .753-.547L13.6 4.687c.37-.743 1.43-.743 1.797 0z"
	/>
</svg>
