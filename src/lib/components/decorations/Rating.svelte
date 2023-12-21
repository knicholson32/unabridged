<script lang="ts">

	import Star from "./Star.svelte";
  import * as helpers from '$lib/helpers';
  let clazz: string = '';
	export { clazz as class };
  export let rating: number;
  export let numReviews: number | undefined = undefined;
  export let fillColor: string | undefined = undefined;
  export let ratingNumberColor: string = 'text-gray-700';

</script>

{#if numReviews === undefined}
<span title="{rating.toFixed(2)} stars" class="{clazz} relative select-none inline-flex text-xxs {ratingNumberColor}">
  <Star fillColor={fillColor} fillPercentage={helpers.clamp(rating, 0, 1)}/>
  <Star fillColor={fillColor} fillPercentage={helpers.clamp(rating, 1, 2) - 1}/>
  <Star fillColor={fillColor} fillPercentage={helpers.clamp(rating, 2, 3) - 2}/>
  <Star fillColor={fillColor} fillPercentage={helpers.clamp(rating, 3, 4) - 3}/>
  <Star fillColor={fillColor} fillPercentage={helpers.clamp(rating, 4, 5) - 4}/>
</span>
{:else}
  <span title="{rating.toFixed(2)} stars from {numReviews.toLocaleString()} reviews" class="{clazz} relative select-none inline-flex text-xxs {ratingNumberColor}">
    <Star fillColor={fillColor} fillPercentage={helpers.clamp(rating, 0, 1)}/>
    <Star fillColor={fillColor} fillPercentage={helpers.clamp(rating, 1, 2) - 1}/>
    <Star fillColor={fillColor} fillPercentage={helpers.clamp(rating, 2, 3) - 2}/>
    <Star fillColor={fillColor} fillPercentage={helpers.clamp(rating, 3, 4) - 3}/>
    <Star fillColor={fillColor} fillPercentage={helpers.clamp(rating, 4, 5) - 4}/>
    <span class="relative top-[0.04rem] ml-2">{numReviews.toLocaleString()} reviews</span>
  </span>
{/if}