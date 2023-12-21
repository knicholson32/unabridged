# create-svelte

Everything you need to build a Svelte project, powered by [`create-svelte`](https://github.com/sveltejs/kit/tree/master/packages/create-svelte).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npm create svelte@latest

# create a new project in my-app
npm create svelte@latest my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.




## Notes

### Steps
1. Link an Audible account
2. Browse the books in all the accounts and select which ones should be added to the library
3. For each book or set of books, have the ability to:
  * Change details about the book such as title, etc.
  * Add or remove genres / rating
  * Change the description
  * Add or remove it from a series/collection
4. Download and process selected books to the library

### Browse Available Library
* Be able to browse the local library and sort by lots of params
* Be able to change params for a book or set of books

### Browse Local Library
* Be able to browse the local library and sort by lots of params
* Be able to change params for a book or set of books


### ToDo
[X] Allow an account to be re-authenticated, so if there is an issue you don't lose all the books
[ ] Process parts as well as chapters (See Bobiverse: We Are Legion)
[~] Re-implement AAXtoMP3 in-house to enable the titles to be what we specifically set (AAXtoMP3 picks second title which is the title and subtitle combined)


### Features To Add
[ ] Add a calendar showing when books were added to Audible / Unabridged
[ ] Finish the dashboard
[ ] Push-based progress updates
[ ] Docker builds in GitHub
[ ] Asynchronous loading of certain data (https://svelte.dev/blog/streaming-snapshots-sveltekit)
[ ] Snapshots to save pending settings changes instead of blocking page navigation (https://svelte.dev/blog/streaming-snapshots-sveltekit)

### Important Links
* https://github.com/djdembeck/Audnexus.bundle -> used for getting metadata in Plex