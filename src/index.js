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
const createHeadersMiddleware = require("./lib/create-headers-middleware");

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
    if (key === "--debug" || key === "--crawl-whitelist-on-boot") {
      return;
    }

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

  // AWS ALB uses "x-forwarded-proto"
  const HOST_HEADER = process.env.HOST_HEADER || "host";
  const CANONICAL_HOST = process.env.CANONICAL_HOST;

  app.use((req, res, next) => {
    const actualHost = req.headers[HOST_HEADER];
    if (CANONICAL_HOST && actualHost && actualHost !== CANONICAL_HOST) {
      const location = `https://${CANONICAL_HOST}${req.url}`;
      console.log("redirecting", `https://${actualHost}${req.url}`, location);

      res.writeHead(301, { location });
      return res.end();
    }

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

  const crawlAtBootEnabled =
    whitelist && options["--crawl-whitelist-on-boot"] && process.env.CRAWL_HOST;
  const parsedDisablePrerenderingSeconds = parseInt(
    process.env.DISABLE_PRERENDERING_FOR_SECONDS ||
      process.env.CRAWL_DELAY_SECONDS
  );
  const bootedAt = Date.now();

  if (
    parsedDisablePrerenderingSeconds &&
    parsedDisablePrerenderingSeconds > 0
  ) {
    let isEnabled = false;
    prerendercloud.set("shouldPrerenderAdditionalCheck", function (req) {
      isEnabledWas = isEnabled;
      isEnabled =
        new Date() >
        new Date(bootedAt + parsedDisablePrerenderingSeconds * 1000);
      if (isEnabled && !isEnabledWas) {
        console.log(
          "first pre-rendering request since DISABLE_PRERENDERING_FOR_SECONDS was enabled, proceeding"
        );
      }

      return isEnabled;
    });
  }

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

    const redirectsMiddleware = createRedirectsMiddleware(directory);
    if (redirectsMiddleware) {
      app.use(redirectsMiddleware);
    }

    const headersMiddleware = createHeadersMiddleware(directory);
    if (headersMiddleware) {
      app.use(headersMiddleware);
    }

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

  if (crawlAtBootEnabled) {
    const p = () =>
      require("./lib/crawl-whitelist")(process.env.CRAWL_HOST, whitelist).then(
        (results) => {
          console.log("done crawling", results);
          return server;
        }
      );

    if (
      !parsedDisablePrerenderingSeconds ||
      parsedDisablePrerenderingSeconds <= 0
    ) {
      return p();
    }
    console.log(
      "NOTICE: DISABLE_PRERENDERING_FOR_SECONDS configured, waiting",
      parsedDisablePrerenderingSeconds,
      "seconds before crawling"
    );

    const buffer = 1000;
    const delayMs = parsedDisablePrerenderingSeconds * 1000 + buffer;
    setTimeout(() => {
      console.log(
        "DISABLE_PRERENDERING_FOR_SECONDS elapsed, commencing crawl whitelist"
      );

      p();
    }, delayMs);
  }

  if (!options["--enable-middleware-cache"]) {
    console.log(
      "\nWARNING: middleware-cache is off, causing 1-3s delay on page refreshes\n" +
        "        This is desirable during dev and testing while iterating on code\n" +
        "        but \x1b[1min production, use --enable-middleware-cache\x1b[0m for faster responses"
    );
  }

  return server;
};
