<script>
    let total = '';

    async function download() {
        const response = await fetch('/api/download', {
            method: 'POST',
            body: JSON.stringify({}),
            headers: {
                'content-type': 'application/json',
            },
        });

        total = JSON.stringify(await response.json());
    }

    async function sync() {
        const response = await fetch('/api/sync', {
            method: 'POST',
            body: JSON.stringify({}),
            headers: {
                'content-type': 'application/json',
            },
        });

        total = JSON.stringify(await response.json());
    }
</script>

{total}

<button on:click={download}>Download</button>
<button on:click={sync}>Sync</button>
