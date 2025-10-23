# Project arguments
# ARG AAXtoMP3_VERSION=1.3
# ARG TONE_VERSION=0.1.5
ARG NODE_VERSION=24.5.0
ARG USR_LOCAL_EXPORT=/export-usr-bin
ARG ROOT_EXPORT=/export-root
ARG WHEEL_EXPORT=/export-wheel
ARG SERVER_PORT=3000


FROM node:${NODE_VERSION}-alpine3.22 AS node_install

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install pnpm
RUN pnpm fetch --prod


######### Base Image Stage #########################################################################
FROM alpine:3.22 AS dependencies

# Renew args from above
ARG PYTHON_VERSION
# ARG AAXtoMP3_VERSION
ARG S6_OVERLAY_VERSION
# ARG TONE_VERSION
ARG USR_LOCAL_EXPORT
ARG ROOT_EXPORT

# Renew global args
ARG TARGETPLATFORM
ARG TARGETARCH
ARG BUILDPLATFORM

# Create export directories that this image can save artifacts to
RUN echo "---- CREATE EXPORT DIRS ----" \
  && mkdir -p ${USR_LOCAL_EXPORT}/bin \
  && mkdir -p ${ROOT_EXPORT}

# Install dependencies that will be used only to aid the build process
RUN echo "---- INSTALL BUILD DEPENDENCIES ----" \
  && echo http://dl-cdn.alpinelinux.org/alpine/edge/testing >> /etc/apk/repositories \
  && apk add --no-cache --update --upgrade --virtual=build-dependencies automake boost-dev build-base gcc git tar xz fdk-aac-dev wget openssl

# # Install tone
# RUN echo "---- INSTALL TONE ----" \
#   && case "${TARGETARCH}" in \
#     "amd64")  TONE_LINK=https://github.com/sandreas/tone/releases/download/v${TONE_VERSION}/tone-${TONE_VERSION}-linux-musl-x64.tar.gz  ;; \
#     "arm64")  TONE_LINK=https://github.com/sandreas/tone/releases/download/v${TONE_VERSION}/tone-${TONE_VERSION}-linux-musl-arm64.tar.gz  ;; \
#     *) exit 1 ;; \
#   esac; wget $TONE_LINK \
#   && tar xzf tone-*.tar.gz \
#   && mv tone*/tone ${USR_LOCAL_EXPORT}/bin/ \
#   && rm -rf ./tone*

# Compile and install MP4V2
RUN echo "---- COMPILE SANDREAS MP4V2 (for sort-title, sort-album and sort-author) ----" \
  && cd /tmp/ \
  && wget https://github.com/sandreas/mp4v2/archive/refs/heads/master.zip \
  && unzip master.zip \
  && cd mp4v2-master \
  && ./configure --prefix=${USR_LOCAL_EXPORT} && \
  make -j4 && \
  make install && make distclean \
  && rm ${USR_LOCAL_EXPORT}/bin/mp4extract \
  && rm ${USR_LOCAL_EXPORT}/bin/mp4file \
  && rm ${USR_LOCAL_EXPORT}/bin/mp4info \
  && rm ${USR_LOCAL_EXPORT}/bin/mp4subtitle \
  && rm ${USR_LOCAL_EXPORT}/bin/mp4tags \
  && rm ${USR_LOCAL_EXPORT}/bin/mp4track \
  && rm ${USR_LOCAL_EXPORT}/bin/mp4trackdump

# Install AAXtoMP3
COPY ./bin/AAXtoMP3 ${USR_LOCAL_EXPORT}/bin/AAXtoMP3

# Remove build dependencies and packages
RUN echo "---- REMOVE BUILD DEPENDENCIES (to keep image small) ----" \
   && apk del --purge build-dependencies && rm -rf /tmp/* \
   && rm -rf /root/.cache /tmp/*

######### Development Stage ########################################################################
FROM python:3.15-rc-alpine3.22 AS dev

# Renew args from above
ARG NODE_VERSION
ARG USR_LOCAL_EXPORT
ARG WHEEL_EXPORT

# Copy artifacts from the previous stage ()
COPY --from=dependencies "${USR_LOCAL_EXPORT}/" "/usr/local/"

# Install development dependencies
RUN echo "---- INSTALL DEPENDENCIES ----" \
  # && echo http://dl-cdn.alpinelinux.org/alpine/edge/testing >> /etc/apk/repositories \
  && apk --no-cache add bash x264 x265 mediainfo grep findutils ffmpeg jq openssl gcc

# Install build dependencies and Pillow dependencies for Alpine
RUN echo "---- INSTALL PILLOW DEPENDENCIES ----" \
  && apk update && apk add --no-cache \
    jpeg-dev \
    zlib-dev \
    freetype-dev \
    lcms2-dev \
    tcl-dev \
    tk-dev \
    build-base # For compiling Pillow from source if needed

# Copy NodeJS Install
COPY --from=node_install /usr/lib /usr/lib
COPY --from=node_install /usr/local/lib /usr/local/lib
COPY --from=node_install /usr/local/include /usr/local/include
COPY --from=node_install /usr/local/bin /usr/local/bin
COPY --from=node_install /pnpm /pnpm

# Install the Audible-CLI python module and dependencies
RUN echo "---- INSTALL AUDIBLE-CLI ----" \
  && pip3 install audible-cli markdownify natsort

ARG GIT_COMMIT
ENV GIT_COMMIT=$GIT_COMMIT
ENV PROC_SHELL='/bin/sh'
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

# Install pnpm
RUN pnpm fetch --prod


######### Node Modules & Build #####################################################################
FROM node:${NODE_VERSION}-alpine3.22 AS build

ENV DATABASE_URL="file:/db/unabridged.db?connection_limit=1"
ENV STAGE="BUILD"
# Copy the application and move to the copied folder
COPY ./ /app/
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install openssl
RUN apk add --no-cache openssl

# Install pnpm
RUN pnpm fetch --prod

# Install node modules
RUN echo "---- INSTALL NODE MODULES ----" \
  && cd /app/ && pnpm install && pnpm exec prisma generate

# RUN echo "---- INSTALL NODE MODULES ----" \
#   && pnpm install --config.platform=linuxmusl --config.architecture=arm64v8 sharp

# Build the SvelteKit project
RUN echo "---- BUILD SERVER ----" \
  && ORIGIN=${ORIGIN} PROTOCOL_HEADER=x-forwarded-proto HOST_HEADER=x-forwarded-host pnpm run build


######### Production Stage #########################################################################
FROM python:3.15-rc-alpine3.22 AS prod

# Assign labels
LABEL org.opencontainers.image.title="unabridged"
LABEL org.opencontainers.image.description="Docker container for managing and archiving audiobooks"
LABEL org.opencontainers.image.documentation="https://github.com/knicholson32/unabridged"
LABEL org.opencontainers.image.authors="Keenan Nicholson, Norris Nicholson"
LABEL org.opencontainers.image.source="https://github.com/knicholson32/unabridged"

# Renew args from above
# ARG AAXtoMP3_VERSION
# ARG TONE_VERSION
ARG NODE_VERSION
ARG USR_LOCAL_EXPORT
ARG ROOT_EXPORT
ARG WHEEL_EXPORT
ARG SERVER_PORT

# Set environmental variables
# ENV AAXtoMP3_VERSION=${AAXtoMP3_VERSION}
# ENV TONE_VERSION=${TONE_VERSION}
ENV PORT=${SERVER_PORT}
ENV DATABASE_URL="file:/db/unabridged.db?connection_limit=1"
ENV ORIGIN="http://localhost:3000"
ENV PROC_SHELL='/bin/sh'
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Install production dependencies
RUN echo "---- INSTALL DEPENDENCIES ----" \
  && apk --no-cache add bash x264 x265 mediainfo grep findutils ffmpeg jq openssl gcc

# Install build dependencies and Pillow dependencies for Alpine
# TODO: Copy Pillow from the build stage?
RUN echo "---- INSTALL PILLOW DEPENDENCIES ----" \
  && apk update && apk add --no-cache \
    jpeg-dev \
    zlib-dev \
    freetype-dev \
    lcms2-dev \
    tcl-dev \
    tk-dev \
    build-base # For compiling Pillow from source if needed

# Copy NodeJS
COPY --from=node_install /usr/lib /usr/lib
COPY --from=node_install /usr/local/lib /usr/local/lib
COPY --from=node_install /usr/local/include /usr/local/include
COPY --from=node_install /usr/local/bin /usr/local/bin
COPY --from=node_install /pnpm /pnpm

# Install the Audible-CLI python module and dependencies
RUN echo "---- INSTALL AUDIBLE-CLI ----" \
  && pip3 install audible-cli markdownify natsort

# Copy artifacts from the previous stage (base & node)
COPY --from=dependencies "${USR_LOCAL_EXPORT}/" "/usr/local/"
# COPY --from=dependencies "${ROOT_EXPORT}/" "/"
COPY --from=build "/app/prisma/" "/app/prisma"
COPY --from=build "/app/package.json" "/app/package.json"
COPY --from=build "/app/package-lock.json" "/app/package-lock.json"
COPY ./pnpm-workspace.yaml "/app/pnpm-workspace.yaml"

# # Install pnpm
# RUN pnpm fetch --prod

# Install production node dependencies
RUN echo "---- Install Production Dependencies ----" \
  && cd /app \
  && pnpm i --loglevel debug && pnpm exec prisma generate

COPY --from=build "/app/build/" "/app/"

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

STOPSIGNAL SIGKILL
# Set Docker command entry point and expose the proper port
EXPOSE ${SERVER_PORT}/tcp
CMD ["sh","-c","cd /app && pnpm exec prisma migrate deploy && PROTOCOL_HEADER=x-forwarded-proto HOST_HEADER=x-forwarded-host /usr/local/bin/node /app"]