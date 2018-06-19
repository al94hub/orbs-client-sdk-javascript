FROM node:9-stretch

ADD . /opt/orbs-sdk

WORKDIR /opt/orbs-sdk

RUN apt-get update && apt-get install -y python-pip python-dev

RUN ./build.sh
