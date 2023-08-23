<script lang="ts">

	import Star from "./Star.svelte";
  import * as helpers from '$lib/helpers';

  export let rating: number;
  export let numReviews: number;

  let scaledRating = rating;

</script>

<span title="{rating.toFixed(2)} stars from {numReviews.toLocaleString()} reviews" class="relative select-none inline-flex text-xxs text-gray-700">
  <Star fillPercentage={helpers.clamp(scaledRating, 0, 1)}/>
  <Star fillPercentage={helpers.clamp(scaledRating, 1, 2) - 1}/>
  <Star fillPercentage={helpers.clamp(scaledRating, 2, 3) - 2}/>
  <Star fillPercentage={helpers.clamp(scaledRating, 3, 4) - 3}/>
  <Star fillPercentage={helpers.clamp(scaledRating, 4, 5) - 4}/>
  <span class="relative top-[0.04rem] ml-2">{numReviews.toLocaleString()} reviews</span>
</span>