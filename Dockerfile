from node:14-slim

RUN apt-get update && apt-get install -y --no-install-recommends apt-utils apt-transport-https

RUN apt-get install -y --no-install-recommends git-core curl ca-certificates

# didn't add this for a reason, just saw it somewhere else, figured it would be useful
RUN apt-get autoremove -y && apt-get clean -y

RUN mkdir app
workdir /app

COPY package.json package-lock.json /app/
run npm install --production

COPY src /app/src

ENTRYPOINT ["node", "/app/src/bin/prerendercloud-server", "/wwwroot"]
