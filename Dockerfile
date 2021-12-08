FROM alpine:edge
# timezone
# https://gitlab.alpinelinux.org/alpine/aports/-/issues/5543
# /usr/share/zoneinfo/Europe/Bucharest
ARG TZ='Europe/Bucharest'
ENV DEFAULT_TZ ${TZ}
RUN apk upgrade --update && \
  apk add --no-cache tzdata && \
  cp /usr/share/zoneinfo/${DEFAULT_TZ} /etc/localtime && \
  date

# prerequisites
RUN apk upgrade --update && \
  apk add --no-cache npm \
  jq \
  curl \
  bash \
  opus \
  ffmpeg

# This hack is widely applied to avoid python printing issues in docker containers.
# See: https://github.com/Docker-Hub-frolvlad/docker-alpine-python3/pull/13
ENV PYTHONUNBUFFERED=1
RUN echo "**** install Python ****" && \
    apk add --no-cache python3 && \
    if [ ! -e /usr/bin/python ]; then ln -sf python3 /usr/bin/python ; fi && \
    \
    echo "**** install pip ****" && \
    python3 -m ensurepip && \
    rm -r /usr/lib/python*/ensurepip && \
    pip3 install --no-cache --upgrade pip setuptools wheel && \
    if [ ! -e /usr/bin/pip ]; then ln -s pip3 /usr/bin/pip ; fi
    
RUN curl --insecure -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl \
	&& chmod a+rx /usr/local/bin/youtube-dl
WORKDIR /cyp
COPY package.json .
RUN npm i
COPY index.js .
COPY app ./app
EXPOSE 8080
ENTRYPOINT ["node", "."]
