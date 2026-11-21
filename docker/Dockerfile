# syntax=docker/dockerfile:1

# Project arguments
ARG NODE_VERSION=24.5.0
# Keep in sync with "packageManager" in package.json. Unpinned, corepack fetches the newest pnpm,
# which may not run on this Node version.
ARG PNPM_VERSION=10.19.0
# audible-cli releases after 0.3.2 require Python < 3.15; on a 3.15 base, pip silently falls back to
# 0.3.2, whose license requests Audible now refuses ("License not granted"). 0.6.0 moves log output
# to stderr and changes the progress bar, which the download parser relies on, so stay on 0.5.x.
ARG PYTHON_VERSION=3.14
ARG AUDIBLE_CLI_VERSION=0.5.1
# sandreas/mp4v2 (for mp4art and mp4chaps, used by AAXtoMP3) is deprecated upstream. Pinned to a
# commit so builds do not change when its master branch does.
ARG MP4V2_COMMIT=148ed1474349d7bfa3dba13ef2da3f08a4a01327
ARG SERVER_PORT=3000


######### mp4v2 ####################################################################################
# Compiled in its own stage; only the two tools AAXtoMP3 uses and their library are copied out.
FROM alpine:3.22 AS mp4v2

ARG MP4V2_COMMIT
RUN apk add --no-cache build-base
RUN cd /tmp \
  && wget -q "https://github.com/sandreas/mp4v2/archive/${MP4V2_COMMIT}.zip" -O mp4v2.zip \
  && unzip -q mp4v2.zip \
  && cd "mp4v2-${MP4V2_COMMIT}" \
  && ./configure --prefix=/export \
  && make -j"$(nproc)" \
  && make install


######### Node #####################################################################################
FROM node:${NODE_VERSION}-alpine3.22 AS node


######### Runtime base #############################################################################
# Everything Unabridged needs at runtime. Shared by the dev and prod images.
FROM python:${PYTHON_VERSION}-alpine3.22 AS runtime

ARG AUDIBLE_CLI_VERSION

# bash, grep, findutils: AAXtoMP3 needs the GNU versions; ffmpeg, mediainfo, jq: conversion;
# openssl: Prisma; libstdc++: Node and mp4v2; tini: passes stop signals on to Node.
# (ffmpeg brings the x264/x265 libraries it needs; AAXtoMP3's other tools come from BusyBox.)
RUN apk add --no-cache bash grep findutils ffmpeg mediainfo jq openssl libstdc++ tini

# Pillow (an audible-cli dependency) installs from a prebuilt musllinux wheel, so no compiler is needed
RUN pip3 install --no-cache-dir "audible-cli==${AUDIBLE_CLI_VERSION}" markdownify natsort

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=mp4v2 /export/bin/mp4art /export/bin/mp4chaps /usr/local/bin/
COPY --from=mp4v2 /export/lib/ /usr/local/lib/
COPY ./bin/AAXtoMP3 /usr/local/bin/AAXtoMP3

ENV PROC_SHELL='/bin/sh'


######### Development ##############################################################################
# The dev container installs packages itself (see docker-compose.dev.yml), so it needs npm and pnpm.
FROM runtime AS dev

ARG PNPM_VERSION
COPY --from=node /usr/local/bin/ /usr/local/bin/
COPY --from=node /usr/local/lib/node_modules/ /usr/local/lib/node_modules/
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# pnpm only: the Node image's bin folder already has yarn links, which `corepack enable` would clash with
RUN corepack enable pnpm && corepack prepare pnpm@${PNPM_VERSION} --activate

ARG GIT_COMMIT
ENV GIT_COMMIT=$GIT_COMMIT


######### Packages and build #######################################################################
# Package manifests are copied before the source, so code changes don't reinstall packages.
FROM node:${NODE_VERSION}-alpine3.22 AS pnpm

ARG PNPM_VERSION
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache openssl \
  && corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Runtime packages only. The build bundles everything else into build/; at runtime the app loads only
# "dependencies" (Prisma, sharp, node-cron), plus the prisma command for migrations.
FROM pnpm AS prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --prod --frozen-lockfile --store-dir /pnpm/store
COPY prisma ./prisma
RUN pnpm exec prisma generate

FROM pnpm AS build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile --store-dir /pnpm/store
COPY . .
ENV STAGE="BUILD"
ENV DATABASE_URL="file:/db/unabridged.db?connection_limit=1"
RUN pnpm exec prisma generate && pnpm run build


######### Production ###############################################################################
FROM runtime AS prod

LABEL org.opencontainers.image.title="unabridged"
LABEL org.opencontainers.image.description="Docker container for managing and archiving audiobooks"
LABEL org.opencontainers.image.documentation="https://github.com/knicholson32/unabridged"
LABEL org.opencontainers.image.authors="Keenan Nicholson, Norris Nicholson"
LABEL org.opencontainers.image.source="https://github.com/knicholson32/unabridged"

ARG SERVER_PORT
ENV PORT=${SERVER_PORT}
ENV DATABASE_URL="file:/db/unabridged.db?connection_limit=1"
ENV ORIGIN="http://localhost:3000"
ENV PROTOCOL_HEADER=x-forwarded-proto
ENV HOST_HEADER=x-forwarded-host

WORKDIR /app
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/prisma ./prisma
COPY --from=build /app/build/ ./

ARG GIT_COMMIT
ARG GIT_REF
ARG GIT_REF_PROTECTED
ARG REGISTRY_IMAGE
ARG CI
ENV GIT_COMMIT=$GIT_COMMIT
ENV GIT_REF=$GIT_REF
ENV GIT_REF_PROTECTED=$GIT_REF_PROTECTED
ENV REGISTRY_IMAGE=$REGISTRY_IMAGE
ENV CI=$CI

EXPOSE ${SERVER_PORT}/tcp
# tini runs as PID 1 so `docker stop` (SIGTERM) reaches Node and child processes are cleaned up.
# `exec` makes Node replace the shell, so the signal is not swallowed by sh.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node index.js"]
