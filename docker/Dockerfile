# Project arguments
ARG AAXtoMP3_VERSION=1.3
ARG TONE_VERSION=0.1.5
ARG NODE_VERSION=20.10.0
ARG USR_LOCAL_EXPORT=/export-usr-bin
ARG ROOT_EXPORT=/export-root
ARG WHEEL_EXPORT=/export-wheel
# ARG SERVER_DIRECTORY=/app
ARG SERVER_PORT=3000


FROM node:${NODE_VERSION}-alpine AS node_install

######### Base Image Stage #########################################################################
FROM alpine:3.18 as dependancies

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

# # Install AAXtoMP3
# RUN echo "---- INSTALL AAXtoMP3 ----" \
#   && wget https://github.com/KrumpetPirate/AAXtoMP3/releases/download/v${AAXtoMP3_VERSION}/AAXtoMP3-v${AAXtoMP3_VERSION}.tar.gz -O - | tar -xz \
#   && cp -vn ./AAXtoMP3/AAXtoMP3 ${USR_LOCAL_EXPORT}/bin/AAXtoMP3

# # Install AAXtoMP3
# RUN echo "---- INSTALL AAXtoMP3 ----" \
#   && wget -O ${USR_LOCAL_EXPORT}/bin/AAXtoMP3 https://raw.githubusercontent.com/KrumpetPirate/AAXtoMP3/master/AAXtoMP3

# Install AAXtoMP3
COPY ./bin/AAXtoMP3 ${USR_LOCAL_EXPORT}/bin/AAXtoMP3

# Remove build dependancies and packages
RUN echo "---- REMOVE BUILD DEPENDENCIES (to keep image small) ----" \
   && apk del --purge build-dependencies && rm -rf /tmp/* \
   && rm -rf /root/.cache /tmp/*

# ######### Wheel Build Stage ########################################################################
# FROM python:3.11.4-alpine3.18 as wheel

# # Renew args from above
# ARG WHEEL_EXPORT

# # Install dependancies that will be used only to aid the build process
# RUN echo "---- INSTALL BUILD DEPENDENCIES ----" \
#   && echo http://dl-cdn.alpinelinux.org/alpine/edge/testing >> /etc/apk/repositories \
#   && apk add --no-cache --update --upgrade --virtual=build-dependencies gcc libgcc musl-dev jpeg-dev zlib-dev

# # Compile the wheels and save to export location
# RUN echo "---- BUILD WHEELS ----" \
#   && pip3 install wheel \
#   && pip3 wheel -w ${WHEEL_EXPORT} audible-cli markdownify natsort

# # Remove build dependancies and packages
# RUN echo "---- REMOVE BUILD DEPENDENCIES (to keep image small) ----" \
#    && apk del --purge build-dependencies && rm -rf /tmp/* \
#    && rm -rf /root/.cache /tmp/*



######### Development Stage ########################################################################
FROM python:3.11.4-alpine3.18 as dev

# Renew args from above
ARG NODE_VERSION
ARG USR_LOCAL_EXPORT
ARG WHEEL_EXPORT

# Copy artifacts from the previous stage ()
COPY --from=dependancies "${USR_LOCAL_EXPORT}/" "/usr/local/"
# COPY --from=wheel "${WHEEL_EXPORT}/" "/tmp/whl/"

# Install development dependancies
RUN echo "---- INSTALL DEPENDENCIES ----" \
  # && echo http://dl-cdn.alpinelinux.org/alpine/edge/testing >> /etc/apk/repositories \
  && apk --no-cache add bash x264 x265 mediainfo grep findutils ffmpeg jq build-base

# Copy NodeJS Install
COPY --from=node_install /usr/lib /usr/lib
COPY --from=node_install /usr/local/lib /usr/local/lib
COPY --from=node_install /usr/local/include /usr/local/include
COPY --from=node_install /usr/local/bin /usr/local/bin

# Install the Audible-CLI python module and dependancies
RUN echo "---- INSTALL AUDIBLE-CLI ----" \
  # && pip3 --no-cache-dir install audible-cli markdownify natsort
  && pip3 install  audible-cli markdownify natsort
  # && rm -rf /tmp/*
# && pip3 install --no-index --find-links=/tmp/whl audible-cli markdownify natsort \

ARG GIT_COMMIT
ENV GIT_COMMIT=$GIT_COMMIT
ENV PROC_SHELL='/bin/sh'

######### Node Modules & Build #####################################################################
FROM node:${NODE_VERSION}-alpine as build

# Copy the application and move to the copied folder
COPY ./app/ /app/
WORKDIR /app

# Install node modules
RUN echo "---- INSTALL NODE MODULES ----" \
  && cd /app/ && npm i && npx prisma generate

# Build the SvelteKit project
RUN echo "---- BUILD SERVER ----" \
  && ORIGIN=${ORIGIN} PROTOCOL_HEADER=x-forwarded-proto HOST_HEADER=x-forwarded-host npm run build

######### Production Stage #########################################################################
FROM python:3.11.4-alpine3.18 as prod

# Assign labels
LABEL org.opencontainers.image.title unabridged
LABEL org.opencontainers.image.description Docker container for managing and archiving audiobooks
LABEL org.opencontainers.image.documentation https://github.com/knicholson32/unabridged
LABEL org.opencontainers.image.authors Keenan Nicholson, Norris Nicholson
LABEL org.opencontainers.image.source https://github.com/knicholson32/unabridged

# Renew args from above
ARG AAXtoMP3_VERSION
ARG TONE_VERSION
ARG NODE_VERSION
ARG USR_LOCAL_EXPORT
ARG ROOT_EXPORT
ARG WHEEL_EXPORT
ARG SERVER_PORT

# Set environmental variables
ENV AAXtoMP3_VERSION=${AAXtoMP3_VERSION}
ENV TONE_VERSION=${TONE_VERSION}
ENV PORT=${SERVER_PORT}
ENV DATABASE_URL="file:/db/unabridged.db?connection_limit=1"
ENV ORIGIN="http://localhost:3000"
ENV PROC_SHELL='/bin/sh'

# Install production dependancies
RUN echo "---- INSTALL DEPENDENCIES ----" \
  && apk --no-cache add bash x264 x265 mediainfo grep findutils ffmpeg jq

# Copy NodeJS
COPY --from=node_install /usr/lib /usr/lib
COPY --from=node_install /usr/local/lib /usr/local/lib
COPY --from=node_install /usr/local/include /usr/local/include
COPY --from=node_install /usr/local/bin /usr/local/bin

# # Copy artifacts from the previous stage (wheel)
# COPY --from=wheel "${WHEEL_EXPORT}/" "/tmp/whl/"

# Install the Audible-CLI python module and dependancies
# TODO: When this issue is resolved, the wheel should already exist: https://github.com/python-pillow/pillow-wheels/issues/346
RUN echo "---- INSTALL AUDIBLE-CLI ----" \
  # && ls /tmp/whl \
  && pip3 install audible-cli markdownify natsort
  # && rm -rf /tmp/*
# && pip3 install --no-index --find-links=/tmp/whl audible-cli markdownify natsort \

# Copy artifacts from the previous stage (base & node)
COPY --from=dependancies "${USR_LOCAL_EXPORT}/" "/usr/local/"
# COPY --from=dependancies "${ROOT_EXPORT}/" "/"
COPY --from=build "/app/prisma/" "/app/prisma"
COPY --from=build "/app/package.json" "/app/package.json"
COPY --from=build "/app/package-lock.json" "/app/package-lock.json"

# Install production node dependancies
RUN echo "---- Install Production Dependancies ----" \
  && cd /app \
  && npm ci --omit dev --loglevel verbose && npx prisma generate

COPY --from=build "/app/build/" "/app/"

# # Prepare the DB
# RUN echo "---- Prepare the Database ----" \
#   && cd /app \
#   && npx prisma generate

ARG GIT_COMMIT
ENV GIT_COMMIT=$GIT_COMMIT

STOPSIGNAL SIGKILL
# Set Docker command entry point and expose the proper port
EXPOSE ${SERVER_PORT}/tcp
CMD ["sh","-c","cd /app && npx prisma migrate deploy && PROTOCOL_HEADER=x-forwarded-proto HOST_HEADER=x-forwarded-host /usr/local/bin/node /app"]
# ENTRYPOINT ["/init"]app