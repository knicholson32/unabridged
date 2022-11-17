# FROM python:3.11.0-slim-bullseye
FROM linuxserver/beets:latest

ARG TARGETPLATFORM
ARG BUILDPLATFORM

# ADD resources //

# Add Beets-Audible data (https://github.com/Neurrone/beets-audible)
COPY beets-audible/config /config
COPY beets-audible/plugins /plugins
COPY beets-audible/scripts /scripts

# # Add manager compiled code
# COPY ui/bin /manager
# COPY ui/package.json /ui/package.json
# COPY ui/package-lock.json /ui/package-lock.json

# Add auto-start services
COPY services.d /etc/services.d

RUN echo "---- INSTALL BUILD DEPENDENCIES ----" \
    && echo http://dl-cdn.alpinelinux.org/alpine/edge/testing >> /etc/apk/repositories \
    && apk add --no-cache --update --upgrade --virtual=build-dependencies \
    autoconf \
    automake \
    boost-dev \
    build-base \
    gcc \
    git \
    tar \
    fdk-aac-dev \
    wget && \
echo "---- INSTALL DEPENDENCIES ----" \
    && echo http://dl-cdn.alpinelinux.org/alpine/edge/testing >> /etc/apk/repositories \
    && apk add x264 x265 mediainfo grep findutils nodejs=16.17.1-r0 npm=8.1.3-r0&& \
echo "---- COMPILE SANDREAS MP4V2 (for sort-title, sort-album and sort-author) ----" \
  && cd /tmp/ \
  && wget https://github.com/sandreas/mp4v2/archive/refs/heads/master.zip \
  && unzip master.zip \
  && cd mp4v2-master \
  && ./configure && \
  make -j4 && \
  make install && make distclean && \
echo "---- INSTALL AAXtoMP3 ----" \
  && wget https://github.com/KrumpetPirate/AAXtoMP3/releases/download/v1.3/AAXtoMP3-v1.3.tar.gz -O - | tar -xz \
  && cp -vn ./AAXtoMP3/AAXtoMP3 /usr/bin/AAXtoMP3 \
  && rm -rf ./AAXtoMP3 && \
# echo "---- INSTALL TONE ----" \
#   && wget https://github.com/sandreas/tone/releases/download/v0.1.2/tone-0.1.2-linux-arm64.tar.gz \
#   && tar xzf tone-*.tar.gz \
#   && mv tone*/tone /usr/local/bin/ \
#   && rm -rf ./tone* && \
echo "---- REMOVE BEET AUTO-START ----" \
  && rm -rf /etc/services.d/beets && \
echo "---- INSTALL AUDIBLE-CLI ----" \
  && pip3 install audible-cli markdownify natsort beets-copyartifacts3 && \
# echo "---- INSTALL NODE_MODULES ----" \
#   && cd /manager && npm install --production && cd / && \
echo "---- REMOVE BUILD DEPENDENCIES (to keep image small) ----" \
   && apk del --purge build-dependencies && rm -rf /tmp/* \
   && rm -rf /root/.cache /tmp/*