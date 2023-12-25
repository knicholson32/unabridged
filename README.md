## ![Unabridged Logo](https://github.com/knicholson32/unabridged/raw/assets/Unabridged.png?raw=true)

[![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/knicholson32/unabridged/docker-build.yml)](https://github.com/knicholson32/unabridged/actions)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/knicholson32/unabridged/issues)
[![Docker Image Size with architecture (latest by date/latest semver)](https://img.shields.io/docker/image-size/keenanrnicholson/unabridged)](https://hub.docker.com/r/keenanrnicholson/unabridged/tags)
[![Docker Pulls](https://img.shields.io/docker/pulls/keenanrnicholson/unabridged)](https://hub.docker.com/r/keenanrnicholson/unabridged/tags)

# Introduction

Unabridged is a `docker` container that downloads and manages audio-books from Audible (and other sources in the future), and saves them to a folder that can be served by a local instance of [Plex](https://www.plex.tv/). Using an app like [Prologue](https://prologue.audio/) lets you then listen to your Plex-hosted, Unabridged-managed audio-books from anywhere.

### **Notice**: Unabridged is in development, and is not currently stable.

## Features

- Easy to use GUI
- Multiple account sources
- Automatic Plex collection management
- Sorting of books by name, series order, and more
- Ability to modify book parameters

# Usage

Typical `docker-compose.yml`:

```yml
version: '3.8'
services:
  unabridged:
    image: 'keenanrnicholson/unabridged:latest'
    container_name: unabridged
    restart: unless-stopped
    environment:
      # Change to match URL (IE: http://192.168.1.100:3000 or https://unabridged.changeme.org)
      ORIGIN: 'https://unabridged.changeme.org'
      # Default timezone. Can be changed here, or updated in settings
      TZ: 'America/New_York'
    ports:
      - '3000:3000'
    volumes:
      # Location of database and media files
      - /my/local/storage/db:/db
      # Location of books. May be hundreds of GB depending on library size.
      - /my/local/storage/library:/library

  plex:
    image: 'lscr.io/linuxserver/plex:latest'
    container_name: plex
    restart: unless-stopped
    environment:
      PUID: 1000
      PGID: 1000
      VERSION: docker
      TZ: America/New_York
    ports:
      - '32400:32400'
    volumes:
      - /my/local/storage/library/plex:/config
      # The same library folder from Unabridged should be served to Plex
      - /my/local/storage/library:/library:/audiobooks
```

Unabridged is _not_ designed to be accessible to the public internet. A reverse proxy such as [traefik](https://traefik.io/traefik/) or [Nginx Proxy Manager](https://nginxproxymanager.com/) should be used if `https` is required. Access to Unabridged should be confined to your local network or intelligently managed.

# Development

Unabridged is based on [SvelteKit](https://kit.svelte.dev/), and therefore is developed using `vite`. However, due to the types of dependencies required to encode the audio files Unabridged uses, development for Unabridged is done inside a developmental Docker image.

If first-time or if `./library/db/unabridged.db` does not exist:

```shell
# Switch to correct version of node using `nvm`
nvm use

# Install prisma globally
npm i prisma -g

# Create the database file
npx prisma db push
```

Create the dev image and start a local development session:

```shell
# Start dev environment
make dev
```

Build the project and serve it locally without creating the full Docker image:

```shell
# Build to node-adapter and preview result
make preview
```

Create the Docker image and serve it locally:

```shell
# Build the full image and host it locally
make create-local && make local
```

In all of the above cases, the front-end URL is [`http://localhost:5173/`](http://localhost:5173/)

## Database

Unabridged uses [`prisma`](https://www.prisma.io/) for database (`sqlite`) access and management, with the schema stored in `prisma/schema.prisma`. When the dev environment is loaded, `prisma` expects the database to already exist. In the production environment, `prisma` performs database migrations and will create the database if it does not exist. An automatic database migration is not performed in dev to allow database schema modifications and experiments without creating an official database migration.

### After modifying the schema during development

```shell
# Check the prisma format
npx prisma format

# Push the changes to the DB. This may delete DB data.
npx prisma db push
```

### Before committing / building the prod container

```shell
# Check the prisma format
npx prisma format

# Create a migration & push the changes to the DB
npx prisma migrate dev --name v0.0.0 # Change this version

# Check the resulting migration file in `/prisma/migrations` to make sure it will do what is expected during the migration
```

## `node_modules`

During development, a `node_modules` folder is created in the top-level directory. Note that the libraries within are not necessarily compatible with your local machine, as they were installed within the Docker container environment. This means that if `npm i` is ran outside the Docker container, the incorrect libraries will be loaded by the dev environment. If issues are encountered with respect to dependencies, delete the `node_modules` folder and try again to allow the container environment to install the correct libraries.

## Folder Structure

All source code is in `src`, with `lib` and `routes` being the primary development folders.

```shell
Directory       Client/Server   Description
───────────────────────────────────────────
src
 ├─lib
 │  ├─components      C         # Svelte components
 │  ├─events          C         # Client-side event library
 │  ├─helpers        S/C        # Client-side and server-side helpers
 │  ├─server          S         # Primary server code
 │  │  ├─cmd          S         # Location of command functions (audible-cli, AAXtoMP3)
 │  │  ├─env          S         # Server environmental variables (static)
 │  │  ├─events       S         # Server-side event library
 │  │  ├─helpers      S         # Server-side helper functions
 │  │  ├─lookup       S         # Type definitions  for some public APIs
 │  │  ├─media        S         # Media management functions
 │  │  ├─plex         S         # Plex integration functions
 │  │  ├─prisma       S         # Prisma instance
 │  │  └─settings     S         # Settings sub-system
 │  ├─table           C         # Table library for /library endpoint
 │  └─types          S/C        # Shared client-side and server types
 └─routes            S/C        # Front-end routes and API endpoints
    ├─api            S/C        # Front-end API endpoints
    ├─library        S/C        # Front-end library pages / tools
    ├─settings       S/C        # Front-end settings pages / tools
    └─sources        S/C        # Front-end file sources pages / tools
```

## `dev` vs `prod`

There are some differences between the dev environment and the production environment. The primary difference applicable to development is hot-reloading. Since `vite` watches for changes in files, and the dev Docker container is mounted to the local file directory, changes in code will trigger a reload in the dev environment. This makes for very efficient development, as the container does not have to be restarted to reflect changes. _However_, the hot-reload is **not** an actual reload. The following are some examples of async code server-side that will still exist after the hot-reload:

- `setTimeout` and `setInterval` functions
- The processes created by `child_process.spawn(...)` and similar
- Anything stored in `global`

As a result, Unabridged uses `globals` to ensure these hanging functions don't last beyond a reload, as `globals`:

```Typescript
// Clear the interval function before starting another one
if (global.interval !== undefined) clearInterval(global.interval);

// Start the new interval
global.interval = setInterval(() => {}, 1000);
```

The production environment does not hot-reload, so these functions are not necessary. However, they also don't cause issues, so they are left in production code.

## Debug Logs

During development, it is often useful to see more logs. Activate `debug` in `settings` to increase the verbosity of console logs. Use the `debug` level setting in code when appropriate:

```Typescript
const debug = await settings.get('system.debug');
if (debug) console.log('Debug message here!');
```

## Audible Accounts

Before clearing the database, it is recommended to delete signed-in Audible accounts so they aren't left signed-in. Once the database is cleared, Unabridged has no way to sign out and another device will be registered if Unabridged is used again.

[Revove devices from your account](https://help.audible.com/s/article/remove-devices-from-account?language=en_US) that were not removed by unabridged if required. 

## Audible CLI
Unabridged uses [`audible-cli`](https://github.com/mkb79/audible-cli) to communicate with the Audible API and download books. To interact directly with the `cli`, utilize the development container:
```Bash
# "SSH" into the docker container
docker exec -it <container name> /bin/sh

# Find the account IDs
cat /db/audible/config.toml

# Prepend the CLI with `AUDIBLE_CONFIG_DIR=/db/audible` so it knows where the `config.toml` file is
AUDIBLE_CONFIG_DIR=/db/audible audible -P <Account ID> library list
```