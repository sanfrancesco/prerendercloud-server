// https://stackoverflow.com/a/50484916
// eslint-disable-next-line
const S3_BUCKET_REGEX =
  /(?=^.{3,63}$)(?!^(\d+\.)+\d+$)(^(([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$)/;

const updateNotifier = require("update-notifier");
const pkg = require("./../package.json");

updateNotifier({ pkg }).notify();

const connect = require("connect");
const path = require("path");
const serveStatic = require("serve-static");
const serveStaticFile = require("connect-static-file");
const compression = require("compression");
const app = connect();
const createRedirectsMiddleware = require("./lib/create-redirects-middleware");

const PORT = 9000;
const DIRECTORY = "public";
const FILE = "index.html";
const HOST = "0.0.0.0";

const sanityCheck = require("./lib/sanity-check");

const configureS3Proxy = require("./lib/configure-s3-proxy");

exports.start = function (options, _onStarted) {
  options = options || {};

  const port = options.port || process.env.PORT || PORT;
  const directory = options.directory || DIRECTORY;
  const file = FILE;
  const host = options.host || HOST;
  const onStarted = _onStarted || function () {};

  let s3Bucket = null;

  if (directory.startsWith("s3://")) {
    const bucketWithoutS3Prefix = directory.replace(/s3:\/\//, "");
    const s3BucketMatches = bucketWithoutS3Prefix.match(S3_BUCKET_REGEX);

    if (!s3BucketMatches) {
      console.log("invalid s3 bucket name", bucketWithoutS3Prefix);
      process.exit(1);
    }

    s3Bucket = s3BucketMatches[0];

    console.log("\nProxying to s3 bucket:", s3Bucket, "\n");
  } else {
    sanityCheck(directory);
  }

  if (options.debug) {
    process.env["DEBUG"] = "prerendercloud,prerendercloudserver";
  }

  const prerendercloud = require("prerendercloud");
  prerendercloud.set("disableServerCache", true);

  const optionsMap = require("./lib/options");
  Object.keys(optionsMap).forEach((key) => {
    if (options[key]) {
      if (key === "--enable-middleware-cache") {
        console.log("middleware cache enabled");
        prerendercloud.set(optionsMap[key], true);

        const middlwareCacheMaxMegabytes = parseInt(
          process.env.MIDDLEWARE_CACHE_MAX_MEGABYTES
        );
        if (
          middlwareCacheMaxMegabytes &&
          middlwareCacheMaxMegabytes > 1 &&
          middlwareCacheMaxMegabytes < 10000
        ) {
          console.log(
            "MIDDLEWARE_CACHE_MAX_MEGABYTES configured",
            middlwareCacheMaxMegabytes
          );
          prerendercloud.set(
            "middlewareCacheMaxBytes",
            middlwareCacheMaxMegabytes * 1000000
          );
        } else {
          console.log(
            "MIDDLEWARE_CACHE_MAX_MEGABYTES not specified, defaulting to 500MB"
          );
        }
      } else if (key === "--ignore-all-query-params") {
        console.log("ignoring all query params");
        prerendercloud.set("whitelistQueryParams", (req) => []);
      } else if (key === "--meta-only") {
        console.log("enabling", key);
        prerendercloud.set(optionsMap[key], () => true);
      } else {
        console.log("enabling", key);
        prerendercloud.set(optionsMap[key], true);
      }
    }
  });

  if (!options["--enable-middleware-cache"]) {
    console.log("");
    console.log(
      "Warning: middleware-cache is not enabled, which means every page refresh will hit the prerender.cloud API, adding ~1.5s to each request. After verifying that things are working, use --enable-middleware-cache to speed things up\n"
    );
    console.log("");
  }

  app.use((req, res, next) => {
    if (req.url === "/_redirects" || req.url === "/_whitelist.js") {
      res.statusCode = 404;
      return res.end("not found");
    } else {
      return next();
    }
  });

  app.use(compression());

  app.use(prerendercloud);

  const parseWhitelist = require("./lib/whitelist");
  const whitelist = parseWhitelist(directory);

  if (s3Bucket) {
    // TODO: implement whitelist and redirects for s3 proxy
    //       1. either read from s3 bucket or
    //       2. specify separate option to read the files from
    configureS3Proxy(
      app,
      s3Bucket,
      process.env.AWS_ACCESS_KEY,
      process.env.AWS_SECRET_KEY
    );
  } else {
    if (whitelist) {
      prerendercloud.set("whitelistPaths", (req) => whitelist);
    }
    app.use(createRedirectsMiddleware(directory));

    app.use(
      serveStatic(directory, {
        extensions: ["html"],
        etag: false,
        cacheControl: false,
        lastModified: false,
      })
    );

    // 3. Finally, serve the fallback file
    app.use(serveStaticFile(path.join(directory, file)), {
      etag: false,
      lastModified: false,
    });
  }

  const server = app.listen(port, host, (err) =>
    onStarted(err, server.address())
  );

  return server;
};
