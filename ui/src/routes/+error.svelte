<script>
    import { page } from '$app/stores';
</script>

<h1>{$page.status}: {$page.error?.message}. Please try again.</h1>
