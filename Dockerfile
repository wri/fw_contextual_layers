FROM node:11-stretch
MAINTAINER info@vizzuality.com

ENV NAME fw-contextual-layer

RUN apt-get update -y && apt-get upgrade -y

RUN apt-get install -y --no-install-recommends bash git openssh-client openssh-server python \
     libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev build-essential g++

RUN yarn global add grunt-cli bunyan

RUN mkdir -p /opt/$NAME
COPY package.json /opt/$NAME/package.json
COPY yarn.lock /opt/$NAME/yarn.lock
COPY .eslintrc /opt/$NAME/.eslintrc
RUN cd /opt/$NAME && yarn

COPY config /opt/$NAME/config

WORKDIR /opt/$NAME

COPY ./app /opt/$NAME/app

# Tell Docker we are going to use this port
EXPOSE 3025

CMD node app/index.js
