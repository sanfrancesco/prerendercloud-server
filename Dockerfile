from node:8.11.3-slim

# the yarn install needs this
RUN apt-get update && apt-get install -y --no-install-recommends apt-utils apt-transport-https

# 2017-01-15, I have a dev dependency of jasmine, specifying a git repo
# but yarn --production is broken and installs dev dependencies, do I need git
RUN apt-get install -y --no-install-recommends git-core

# https://yarnpkg.com/en/docs/install#linux-tab
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update && apt-get install -y --no-install-recommends yarn

RUN apt-get autoremove && apt-get clean

RUN mkdir app
workdir /app

COPY package.json yarn.lock /app/
run yarn install --production

COPY src /app/src

ENTRYPOINT ["node", "/app/src/bin/prerendercloud-server", "/wwwroot"]
