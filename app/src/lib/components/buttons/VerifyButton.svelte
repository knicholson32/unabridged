<script lang="ts">
  export let click: () => void;
  export let verifyCoolDown = 3000;
  let clazz: string = '';
	export { clazz as class };

  let warningState = false;
  const _click = () => {
    if (warningState === false) {
      warningState = true;
      setTimeout(() => {
        warningState = false;
      }, verifyCoolDown);
      return;
    }
    click();
  }
</script>


<button type="button" on:click={_click} class="{clazz}">
  <div class="{warningState ? 'hidden' : 'block'}">
    <slot name="icon" />
  </div>
  <div class="{!warningState ? 'hidden' : 'block'}">
    <slot name="iconVerify" />
  </div>
</button>