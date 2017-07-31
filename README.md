![image](https://cloud.githubusercontent.com/assets/22159102/21554484/9d542f5a-cdc4-11e6-8c4c-7730a9e9e2d1.png)

# prerendercloud-server

A pushstate server that includes the [official prerender.cloud middleware](https://github.com/sanfrancesco/prerendercloud-nodejs) for server-side rendering your single-page JavaScript applicaiton (React, Angular, Ember, Preact, Vue, etc.)

This is mostly used for testing an app against service.prerender.cloud before going into production.

## Requirements
* index.html at the root of the deployed project
* pushstate URLs
* React, Preact, Angular, Ember, Vue, or any SPA framework that rewrites a container DOM element (Angular users must use templates)

read more here: https://www.prerender.cloud/docs

## Usage

```
npm install -g prerendercloud-server
```

now navigate to your project directory

```
usage: prerendercloud-server [options] [directory]
```

### Environment variables

* `PORT`
* `PRERENDER_TOKEN`
  * without this, you'll be rate limited. Sign up at https://www.prerender.cloud

### Options

* `--help`
* `--debug`
* `--enable-middleware-cache`
  * a local, in-memory cache to avoid hitting service.prerender.cloud on every request

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
