<!-- <script lang="ts">
	import { cubicInOut } from "svelte/easing";

  // Export props

  export let number: number;

  let oldNumber = number;

  $: {
    if (oldNumber !== number) {
      
    }
    oldNumber = number;
  }

</script>

{oldNumber} -->


<script lang="ts">
  // import { nanoid } from "nanoid/nanoid";

  // https://easings.net/#easeInOutQuad
  const easeInOutQuad = (x: number): number => {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }

  // const id = nanoid();

  export let value: number;

  // export let initial = 0;
  // export let duration = 3000;
  // export let step = 1;
  // export let precision = 1;
  export let format = true;

  let displayedValue = value;

  const formatNumber = (input: number) => {
    if (format) {
      return Math.round(input).toLocaleString();
    }
    return input;
  }

  // const counterResult = [];
  // const timers = [];

  // const max = parseInt(value);
  // while (duration / ((max - initial) / step) < 2) {
  //   step++;
  // }



  let animating = false;
  let oldNumber = value;
  let interval: number;
  let x = 0;
  $: {
    if (!animating && oldNumber !== value) {
      animating = true;
      interval = setInterval(() => {
        displayedValue = oldNumber + easeInOutQuad(x) * (value - oldNumber);
        if (x >= 1) {
          clearInterval(interval);
          oldNumber = value;
          displayedValue = value;
          animating = false;
          x = 0;
        } else x += 0.1;
      }, 75);
    }
  }
  
</script>

{formatNumber(displayedValue)}