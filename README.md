![image](https://cloud.githubusercontent.com/assets/22159102/21554484/9d542f5a-cdc4-11e6-8c4c-7730a9e9e2d1.png)

# prerendercloud-server

https://www.prerender.cloud/

A pushstate Node.js server that includes the [official prerender.cloud middleware](https://github.com/sanfrancesco/prerendercloud-nodejs) for server-side rendering your single-page JavaScript application (React, Angular, Ember, Preact, Vue, etc.)

Designed to be an all-in-one hosting + server-side rendering solution. Run it from Node.js or as a Docker container.

## Requirements
* index.html at the root of the deployed project
* pushstate URLs
* React, Preact, Angular, Ember, Vue, or any SPA framework that rewrites a container DOM element (Angular users must use templates)

read more here: https://www.prerender.cloud/docs

## Docker usage

### Local filesystem

Mount the directory from your laptop/server into the Docker container at path `/wwwroot`

This example assumes you're serving the `public` directory from the directory you're launching your Docker container.

```
docker run --rm --name=prerendercloud-webserver -e PRERENDER_TOKEN="my-secret-token" -e DEBUG=prerendercloud -p 9000:9000 -v $(pwd)/public:/wwwroot prerendercloud/webserver --enable-middleware-cache --disable-ajax-preload --disable-ajax-bypass --bots-only
```

### S3 Proxy

Note: the S3 proxy feeature **does not cache data from S3** in the container, although it respects etags (if the client/browser sends `if-none-match`, and S3 returns 304 not modified, then the proxy returns 304 not modified). This means that this container does not need to be restarted when updating content on S3.

```
docker run --rm --name=prerendercloud-webserver -e AWS_ACCESS_KEY="my-aws-key" -e AWS_SECRET_KEY="my-aws-secret" -e PRERENDER_TOKEN="my-secret-token" -e DEBUG=prerendercloud -p 9000:9000 prerendercloud/webserver s3://my-s3-bucket --enable-middleware-cache --disable-ajax-preload --disable-ajax-bypass --bots-only
```

## Node.js Usage

```
npm install -g prerendercloud-server
```

now navigate to your project directory (unless you're using S3, in which case it doesn't matter)

```
usage: prerendercloud-server [options] [LocalPath or S3Uri]
```

### Local filesystem

```
PRERENDER_TOKEN="my-secret-token" prerendercloud-server . --enable-middleware-cache --disable-ajax-preload --disable-ajax-bypass --bots-only
```

### S3 Proxy

```
AWS_ACCESS_KEY="my-aws-key" -e AWS_SECRET_KEY="my-aws-secret" -e PRERENDER_TOKEN="my-secret-token" prerendercloud-server s3://my-s3-bucket --enable-middleware-cache --disable-ajax-preload --disable-ajax-bypass --bots-only
```

### Environment variables

* `PORT`
* `PRERENDER_TOKEN`
  * without this, you'll be rate limited. Sign up at https://www.prerender.cloud
* `MIDDLEWARE_CACHE_MAX_MEGABYTES=1000` (defaults to 500MB, only relevant with --enable-middleware-cache)

### Options

* `--help`
* `--debug`
* `--enable-middleware-cache`
  * a local, 1 hour TTL in-memory cache to avoid hitting service.prerender.cloud on every request
* `--disable-ajax-preload`
* `--disable-ajax-bypass`
* `--ignore-all-query-params`
* `--meta-only`
* `--bots-only`


### Examples

```
# start the server in the current directory
prerendercloud-server
```

```
# start the server for the dist directory
prerendercloud-server dist
```

```
# start the server for the dist directory and run it on PORT 9000
PORT=9000 prerendercloud-server dist
```

```
# start the server for the dist directory and run it on PORT 9000 and use the local cache
# (the cache won't expire until you terminate this node instance)
PORT=9000 prerendercloud-server dist --enable-middleware-cache
```

```
# start the server in the current directory with your API token
# from https://www.prerender.cloud to avoid rate limits
PRERENDER_TOKEN=my-secret-token prerendercloud-server
```

## The _redirects file

Like [Roast.io](https://www.roast.io/) and [Netlify](https://www.netlify.com/), this server supports a _redirects file - read more about it here: https://www.roast.io/docs/config/redirects
