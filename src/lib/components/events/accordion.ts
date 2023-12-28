import { cubicInOut } from "svelte/easing";

export default (node: HTMLElement, options: { heightRem: number, horizontal?: boolean, delay?: number, duration?: number, easing?: (t: number) => number }) => {
  if (options.delay === undefined) options.delay = 0;
  if (options.duration === undefined) options.duration = 100;
  if (options.horizontal === undefined) options.horizontal = false;
  if (options.easing === undefined) options.easing = cubicInOut;
  let css = (t: number) => `max-height: ${t * options.heightRem}rem;`;
  if (options.horizontal) css = (t: number) => `max-width: ${t * options.heightRem}rem;`
  return {
    delay: options.delay,
    duration: options.duration,
    easing: options.easing,
    css: css
  };
};