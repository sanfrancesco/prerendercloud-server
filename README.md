# prerendercloud-server

<img align="right" src="https://cloud.githubusercontent.com/assets/22159102/21554484/9d542f5a-cdc4-11e6-8c4c-7730a9e9e2d1.png">

![Github Actions CI](https://github.com/sanfrancesco/prerendercloud-server/actions/workflows/node.js.yml/badge.svg)

https://www.prerender.cloud/

```bash
# simplest possible example if your built SPA is in a dir named `dist`
npm install -g prerendercloud-server
PORT=9000 prerendercloud-server dist

# now serving your JavaScript single-page app at localhost:9000
# if running from your dev machine (localhost) start a reverse tunnel to get a public IP:
# e.g. 1 if you have ngrok.com account: `ngrok http 9000`
# e.g. 2 if you have a VPS, something like: `ssh user@www.myremotehost.com -R 9000:localhost:9000`
```

A pushstate Node.js http server that includes the [official prerender.cloud middleware](https://github.com/sanfrancesco/prerendercloud-nodejs) for server-side rendering (also known as pre-rendering or dynamic rendering) your single-page JavaScript application (React, Angular, Ember, Preact, Vue, etc.)

Designed to be an all-in-one hosting + server-side rendering solution for single-page JavaScript apps needing pre-rendering or a generic solution to server-side rendering. Run it from Node.js or as a Docker container.

### Requirements

- index.html at the root of the deployed project
- pushstate URLs
- React, Preact, Angular, Ember, Vue, or any SPA framework that rewrites a container DOM element (Angular users must use templates)

#### Notes on caching and pre-rendering lifecyle

By default, this package has _no_ "API request caching" enabled (it does have etags for static files). This means 100% of requests will be forwarded and processed by prerender.cloud's API (service.prerender.cloud). This is the ideal configuration while you're getting things working, but not for production.

Once your app is pre-rendering as you expect, and you're ready to "go to production", use the `--enable-middleware-cache` option. This is an in-memory cache of the responses from requests made to the service.prerender.cloud API. Note, there is also a "server cache" available from prerender.cloud but that is disabled here as a best practice (caching locally via middleware cache is free to you, but using the prerender.cloud server cache costs money).

Simply restart and/or deploy this process to clear that in-memory cache.

Pages are pre-rendered "on-demand", also known as "lazy loading". So if you visit `/docs`, that request will block until the pre-render is complete. If `--enable-middleware-cache` is set, then subsequent requests to `/docs` will come from your local cache (until the process is rebooted or the cache expires).

If you'd like to restrict pre-rendered content to "bots only", use the `--bots-only` config. See the [list of bots here](https://github.com/sanfrancesco/prerendercloud-nodejs/blob/f41a3bd3eef7f20e64409a86f89801acf34e87e2/source/index.js#L45-L76).

If you'd like to restrict which pages are valid for pre-rendering, see the `_whitelist.js` config below. If you have a busy site, this is an important feature to enable to prevent abusive bots from spamming random URLs that may not actually exist causing needless requests to be made to service.prerender.cloud.

Read all documentation here: https://www.prerender.cloud/docs and read more about the config options here: https://github.com/sanfrancesco/prerendercloud-nodejs

<!-- MarkdownTOC autolink="true" -->

- [Plain old Node.js examples](#plain-old-nodejs-examples)
- [Plain old Node.js local filesystem example](#plain-old-nodejs-local-filesystem-example)
- [Plain old Node.js S3 proxy example](#plain-old-nodejs-s3-proxy-example)
- [Fly.io example](#flyio-example)
- [Docker local filesystem example](#docker-local-filesystem-example)
- [Docker S3 proxy example](#docker-s3-proxy-example)
- [Environment variables](#environment-variables)
- [Options](#options)
- [The `_whitelist.js` file](#the-_whitelistjs-file)
- [The `_redirects` file](#the-_redirects-file)

<!-- /MarkdownTOC -->

#### Plain old Node.js examples

```bash
npm install -g prerendercloud-server
```

now navigate to your project directory (unless you're using S3, in which case it doesn't matter)

**usage:** `prerendercloud-server [options] [LocalPath or S3Uri]`

```bash
# start the server in the current directory
prerendercloud-server

# start the server for the dist directory
prerendercloud-server dist

# start the server for the dist directory and run it on PORT 9000
PORT=9000 prerendercloud-server dist

# start the server for the dist directory and run it on PORT 9000 and use the local cache
# (the cache won't expire until you terminate this node instance)
PORT=9000 prerendercloud-server dist --enable-middleware-cache

# start the server in the current directory with your API token
# from https://www.prerender.cloud to avoid rate limits
PRERENDER_TOKEN=my-secret-token prerendercloud-server
```

#### Plain old Node.js local filesystem example

```
PRERENDER_TOKEN="my-secret-token" \
prerendercloud-server . \
--enable-middleware-cache \
--disable-ajax-preload \
--disable-ajax-bypass \
--bots-only
```

#### Plain old Node.js S3 proxy example

```
AWS_ACCESS_KEY="my-aws-key" \
-e AWS_SECRET_KEY="my-aws-secret" \
-e PRERENDER_TOKEN="my-secret-token" \
prerendercloud-server \
s3://my-s3-bucket \
--enable-middleware-cache \
--disable-ajax-preload \
--disable-ajax-bypass \
--bots-only
```

#### Fly.io example

[Fly.io](https://fly.io/) is a modern app deployment platform that can run Dockerfiles and is a painless way to run prerendercloud-server.

See fly-io in the [examples directory](examples/fly-io/)

#### Docker local filesystem example

Mount the directory from your laptop/server into the Docker container at path `/wwwroot`

This example assumes you're serving the `dist` directory from the directory you're launching your Docker container.

```
docker run \
  --rm \
  --name=prerendercloud-webserver \
  -e PRERENDER_TOKEN="my-secret-token" \
  -e DEBUG=prerendercloud \
  -p 9000:9000 \
  -v $(pwd)/dist:/wwwroot \
  prerendercloud/webserver \
  --enable-middleware-cache \
  --disable-ajax-preload \
  --disable-ajax-bypass \
  --bots-only
```

#### Docker S3 proxy example

Note: the S3 proxy feeature **does not cache data from S3** in the container, although it respects etags (if the client/browser sends `if-none-match`, and S3 returns 304 not modified, then the proxy returns 304 not modified). This means that this container does not need to be restarted when updating content on S3.

```
docker run \
  --rm \
  --name=prerendercloud-webserver \
  -e AWS_ACCESS_KEY="my-aws-key" \
  -e AWS_SECRET_KEY="my-aws-secret" \
  -e PRERENDER_TOKEN="my-secret-token" \
  -e DEBUG=prerendercloud \
  -p 9000:9000 \
  prerendercloud/webserver \
  s3://my-s3-bucket \
  --enable-middleware-cache \
  --disable-ajax-preload \
  --disable-ajax-bypass \
  --bots-only
```

#### Environment variables

- `PORT` - default 9000
- `PRERENDER_TOKEN` - need this avoid rate limiting, get an API token from https://www.prerender.cloud/
- `MIDDLEWARE_CACHE_MAX_MEGABYTES` - used with `--enable-middleware-cache`, default is 500
- `CANONICAL_HOST` - if exists, requests made to the server from a non-matching host header will redirect to canonical.
  - most common use case: configure your DNS to point apex and www to `example.com`, set `CANONICAL_HOST=example.com`, and requests to www.example.com will redirect to apex
  - override the header used to detect host with `HOST_HEADER` (defaults to `host`, if on AWS behind ALB, set `HOST_HEADER=x-forwarded-proto`)
- `CRAWL_HOST` - if using `--crawl-whitelist-on-boot`, e.g. `CRAWL_HOST=example.com` (no protocol, no slashes)
  - use with `CRAWL_DELAY_SECONDS` to give your process enough time to boot and go live (35s is a safe/common value)
- `AWS_ACCESS_KEY` and `AWS_SECRET_KEY` if using s3 proxy

#### Options

Read more about these options here: https://github.com/sanfrancesco/prerendercloud-nodejs

- `--help`
- `--debug`
  - verbose debugging
- `--enable-middleware-cache`
  - a local in-memory cache that does not expire (reboot to clear cache) to avoid hitting service.prerender.cloud on every request
- `--meta-only`
  - when you only want to pre-render the `<head />` (useful if all you care about is open graph and meta tags)
- `--bots-only`
- `--ignore-all-query-params`
- `--remove-trailing-slash`
- `--disable-ajax-preload`
- `--disable-ajax-bypass`
- `--disable-head-dedupe`
- `--remove-script-tags`
- `--wait-extra-long`
  - if the pre-rendering process finished too early
- `--follow-redirects`
- `--bubble-up-5xx-errors`
- `--throttle-on-fail`
- `--crawl-whitelist-on-boot`
  - requires a `_whitelist.js` file to exist in wwwroot and `CRAWL_HOST` env var to be set, e.g. `CRAWL_HOST=example.com` (no protocol, no slashes)
  - use this with `--enable-middleware-cache` so visitors don't have to wait for the lazily loaded pre-rendering to finish

#### The `_whitelist.js` file

This project will parse an actual JavaScript file (not JSON) with the filename `_whitelist.js` if in the wwwroot (same place as your index.html).

This file configures the `whitelistPaths` option of the underlying [prerendercloud-nodejs middleware](https://github.com/sanfrancesco/prerendercloud-nodejs). It reduces your potential billing/costs by preventing bots or bad actors from scraping random URLs.

Example `_whitelist.js` file:

```javascript
// strings or regexes
// if this file doesn't exist or the array is empty, any requested path will be pre-rendered
module.exports = ["/", "/docs", /\/users\/\d{1,6}\/profile\/?$/];
```

#### The `_redirects` file

Similar to [Netlify's \_redirects file](https://docs.netlify.com/routing/redirects/#syntax-for-the-redirects-file), this project will parse a `_redirects` file in the wwwroot (same place as your index.html).

Why use this? For redirects, rewrites. This includes avoiding CORS configuration by redirecting a same origin path to a remote API.
In other words, some additional control over routing logic.

- A plain text file in the root of your deploy with the file name \_redirects for controlling routing logic
- Each line is 3 fields separated by any amount of white space:

```
/source/path /destination/path statusCode
```

- The /sourcePath and /destinationPath must start with /
- The status code field is optional and if not specified, defaults to 301.
- Using 200 as a status code is a "rewrite" (or proxy), the user will not see the final/true destination.
- Comments start with #
- White space around or between lines is ignored so use it for readability.
- html file extension is optional

**This rule is already included by default** since this project is for single-page apps. Shown here only as an example of what it would look like if not already included.

```
/* /index.html 200
```

**200 rewrite/proxy splat (wildcard)**

- (for avoiding CORS config on your server)
- (wildcards (asterisks) can only be at the end of a sourcePath and if used, the destinationPath must have :splat at the end)

```
/api/v1/* http://example.com/api/v1/:splat 200
```

**301 redirect /documentation to /docs**

```
/documentation /docs
```

**302 redirect /documentation to /docs**

(same as above, but use 302 instead of the default of 301)

```
/documentation /docs 302
```

**200 rewrite/proxy /documentation to /docs**

```
/documentation /docs 200
```
