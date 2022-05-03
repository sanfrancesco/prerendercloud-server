from node:14-alpine

RUN mkdir app
workdir /app

COPY publish /app
RUN NODE_ENV=production npm install --production
RUN NODE_ENV=production npm prune --production

ENTRYPOINT ["node", "/app/dist/bin/prerendercloud-server", "/wwwroot"]
