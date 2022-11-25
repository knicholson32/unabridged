# Project arguments
ARG AAXtoMP3_VERSION=1.3
ARG TONE_VERSION=0.1.2
ARG NODE_VERSION=16.17.1-r0
ARG S6_OVERLAY_VERSION=3.1.2.1
ARG USR_LOCAL_EXPORT=/export-usr-bin
ARG ROOT_EXPORT=/export-root
ARG SERVER_DIRECTORY=/server
ARG SERVER_PORT=3000

######### Base Image Stage #########################################################################
FROM alpine:3.16 as base

# Renew args from above
ARG PYTHON_VERSION
ARG AAXtoMP3_VERSION
ARG S6_OVERLAY_VERSION
ARG TONE_VERSION
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

# Install dependancies that will be used only to aid the build process
RUN echo "---- INSTALL BUILD DEPENDENCIES ----" \
  && echo http://dl-cdn.alpinelinux.org/alpine/edge/testing >> /etc/apk/repositories \
  && apk add --no-cache --update --upgrade --virtual=build-dependencies automake boost-dev build-base gcc git tar xz fdk-aac-dev wget

# Install tone
RUN echo "---- INSTALL TONE ----" \
  && case "${TARGETARCH}" in \
    "amd64")  TONE_LINK=https://github.com/sandreas/tone/releases/download/v${TONE_VERSION}/tone-${TONE_VERSION}-linux-musl-x64.tar.gz  ;; \
    "arm64")  TONE_LINK=https://github.com/sandreas/tone/releases/download/v${TONE_VERSION}/tone-${TONE_VERSION}-linux-musl-arm64.tar.gz  ;; \
    *) exit 1 ;; \
  esac; wget $TONE_LINK \
  && tar xzf tone-*.tar.gz \
  && mv tone*/tone ${USR_LOCAL_EXPORT}/bin/ \
  && rm -rf ./tone*

# Compile and install MP4V2
RUN echo "---- COMPILE SANDREAS MP4V2 (for sort-title, sort-album and sort-author) ----" \
  && cd /tmp/ \
  && wget https://github.com/sandreas/mp4v2/archive/refs/heads/master.zip \
  && unzip master.zip \
  && cd mp4v2-master \
  && ./configure --prefix=${USR_LOCAL_EXPORT} && \
  make -j4 && \
  make install && make distclean

# Install AAXtoMP3
RUN echo "---- INSTALL AAXtoMP3 ----" \
  && wget https://github.com/KrumpetPirate/AAXtoMP3/releases/download/v${AAXtoMP3_VERSION}/AAXtoMP3-v${AAXtoMP3_VERSION}.tar.gz -O - | tar -xz \
  && cp -vn ./AAXtoMP3/AAXtoMP3 ${USR_LOCAL_EXPORT}/bin/AAXtoMP3

# Install the S6 supervisor layer
RUN echo "---- INSTALL S6 ----" \
  && case "${TARGETARCH}" in \
    "amd64")  S6_OVERLAY_ARCH=x86_64  ;; \
    "arm64")  S6_OVERLAY_ARCH=aarch64  ;; \
    *) exit 1 ;; \
  esac; wget --directory-prefix=/tmp https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz \
  && tar -C ${ROOT_EXPORT} -Jxpf /tmp/s6-overlay-noarch.tar.xz \
  && wget --directory-prefix=/tmp https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${S6_OVERLAY_ARCH}.tar.xz \
  && tar -C ${ROOT_EXPORT} -Jxpf /tmp/s6-overlay-${S6_OVERLAY_ARCH}.tar.xz

# Remove build dependancies and packages
RUN echo "---- REMOVE BUILD DEPENDENCIES (to keep image small) ----" \
   && apk del --purge build-dependencies && rm -rf /tmp/* \
   && rm -rf /root/.cache /tmp/*

######### Development Stage ########################################################################
FROM python:3.11.0-alpine3.16 as dev

# Renew args from above
ARG AAXtoMP3_VERSION
ARG TONE_VERSION
ARG NODE_VERSION
ARG USR_LOCAL_EXPORT

# Set environmental variables
ENV AAXtoMP3_VERSION=${AAXtoMP3_VERSION}
ENV TONE_VERSION=${TONE_VERSION}

# Copy artifacts from the previous stage ()
COPY --from=base "${USR_LOCAL_EXPORT}/" "/usr/local/"

# Install development dependancies
RUN echo "---- INSTALL DEPENDENCIES ----" \
  # && echo http://dl-cdn.alpinelinux.org/alpine/edge/testing >> /etc/apk/repositories \
  && apk --no-cache add bash x264 x265 mediainfo grep findutils ffmpeg jq

# Install NodeJS
RUN echo "---- INSTALL NODEJS ----" \
  && apk --no-cache add nodejs=${NODE_VERSION} npm

# Install the Audible-CLI python module and dependancies
RUN echo "---- INSTALL AUDIBLE-CLI ----" \
  && pip3 --no-cache-dir install audible-cli markdownify natsort

######### Node Modules & Build #####################################################################
FROM node:16.17.1-alpine as node

# Copy the application and move to the copied folder
COPY ./app/ /app/
WORKDIR /app

# Install node modules
RUN echo "---- INSTALL NODE MODULES ----" \
  && cd /app/ && npm i

# Build the SvelteKit project
RUN echo "---- BUILD SERVER ----" \
  && npm run build

######### Prodiction Stage #########################################################################
FROM python:3.11.0-alpine3.16 as prod

# Renew args from above
ARG AAXtoMP3_VERSION
ARG TONE_VERSION
ARG NODE_VERSION
ARG USR_LOCAL_EXPORT
ARG ROOT_EXPORT
ARG SERVER_DIRECTORY
ARG SERVER_PORT

# Set environmental variables
ENV AAXtoMP3_VERSION=${AAXtoMP3_VERSION}
ENV TONE_VERSION=${TONE_VERSION}
ENV PORT=${SERVER_PORT}
ENV SERVER_DIRECTORY=${SERVER_DIRECTORY}

# Copy artifacts from the previous stage (base & node)
COPY --from=base "${USR_LOCAL_EXPORT}/" "/usr/local/"
COPY --from=base "${ROOT_EXPORT}/" "/"
COPY --from=node "/app/build/" "${SERVER_DIRECTORY}/"

# Install production dependancies
RUN echo "---- INSTALL DEPENDENCIES ----" \
  && apk --no-cache add bash x264 x265 mediainfo grep findutils ffmpeg jq

# Install NodeJS
RUN echo "---- INSTALL NODEJS ----" \
  && apk --no-cache add nodejs=${NODE_VERSION} npm

# Install the Audible-CLI python module and dependancies
RUN echo "---- INSTALL AUDIBLE-CLI ----" \
  && pip3 --no-cache-dir install audible-cli markdownify natsort

# Install MongoDB
RUN echo "---- INSTALL MONGODB ----" \
  && echo http://dl-cdn.alpinelinux.org/alpine/v3.9/community >> /etc/apk/repositories \
  && echo http://dl-cdn.alpinelinux.org/alpine/v3.9/main >> /etc/apk/repositories \
  && apk --no-cache update \
  && apk --no-cache add mongodb mongodb-tools \
  && mkdir -p /data/db/

# Add auto-start services
COPY "./docker/services.d/" "/etc/services.d/"

# Set Docker command entry point for S6 and expose the proper port
EXPOSE ${SERVER_PORT}/tcp
CMD ["/usr/bin/node", "/server"]
ENTRYPOINT ["/init"]