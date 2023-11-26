<script lang="ts">
  import { Password } from '$lib/components/input';
  import Frame from './Frame.svelte';
  
  export let value: string;
  export let name: string;
  export let title: string;
  export let placeholder: string = title;
  export let hoverTitle: string = '';
  export let mono: boolean = false;
  export let disabled: boolean = false;
  export let form: { success: boolean, name: string, message: string | undefined } | null = null;

  export let update = () => {};

</script>

<Frame title={title} error={(form?.success === false && form?.name === name) ? form.message ?? null : null}>
  <div class="-my-2">
    <Password 
      input={update}
      disabled={disabled}
      title={hoverTitle} 
      mono={mono}
      name={name}
      placeholder={placeholder}
      bind:value={value}
      />
  </div>
</Frame>