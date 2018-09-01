"use strict";

const updateNotifier = require("update-notifier");
const pkg = require("./../package.json");

updateNotifier({ pkg }).notify();

const connect = require("connect");
const path = require("path");
const serveStatic = require("serve-static");
const serveStaticFile = require("connect-static-file");
const compression = require("compression");
const app = connect();
const createRedirectsMiddleware = require("./lib/createRedirectsMiddleware");

const PORT = 9000;
const DIRECTORY = "public";
const FILE = "index.html";
const HOST = "0.0.0.0";

const consolePrinter = require("./lib/consolePrinter");
const sanityCheck = require("./lib/sanityCheck");

exports.start = function(options, _onStarted) {
  options = options || {};

  let port = options.port || process.env.PORT || PORT;
  let directory = options.directory || DIRECTORY;
  let file = FILE;
  let host = options.host || HOST;
  let onStarted = _onStarted || function() {};

  sanityCheck(directory);

  if (options.debug) {
    process.env["DEBUG"] = "prerendercloud";
  }

  const prerendercloud = require("prerendercloud");
  prerendercloud.set("disableServerCache", true);

  const optionsMap = require("./lib/options");
  Object.keys(optionsMap).forEach(key => {
    if (options[key]) {
      if (key === "--enable-middleware-cache") {
        console.log("middleware cache enabled for 1hr TTL");
        prerendercloud.set(optionsMap[key], 1000 * 60 * 60);
      } else {
        console.log("enabling", key);
        prerendercloud.set(optionsMap[key], true);
      }
    }
  });

  if (!options["--enable-middleware-cache"]) {
    consolePrinter(
      "middleware-cache is not enabled, which means every page refresh will hit the prerender.cloud API, adding ~1.5s to each request. After verifying that things are working, use --enable-middleware-cache to speed things up",
      4
    );
  }

  app.use(compression());

  app.use(prerendercloud);

  // 1. check for redirects
  app.use(createRedirectsMiddleware());

  // 2. check filesystem
  app.use(
    serveStatic(directory, {
      extensions: ["html"],
      etag: false,
      cacheControl: false,
      lastModified: false
    })
  );

  // 3. Finally, serve the fallback file
  app.use(serveStaticFile(path.join(directory, file)), {
    etag: false,
    lastModified: false
  });

  const server = app.listen(port, host, err =>
    onStarted(err, server.address())
  );

  return server;
};
