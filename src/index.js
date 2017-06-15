"use strict";

const connect = require("connect");
const path = require("path");
const serveStatic = require("serve-static");
const serveStaticFile = require("connect-static-file");
const compression = require("compression");
const app = connect();
const fs = require("fs");
const stdlibPath = require("path");

const PORT = 9000;
const DIRECTORY = "public";
const FILE = "index.html";
const HOST = "0.0.0.0";

function consolePrinter(msg, indent = 0) {
  const splitMsg = msg.split("");

  let shortLinesMsg = Array(indent).join(" ");

  for (let i = 0; i < splitMsg.length; i++) {
    if (i > 0 && i % 50 === 0) {
      if (splitMsg[i - 1] !== " " && splitMsg[i] !== " ") shortLinesMsg += "-";

      shortLinesMsg += `\n${Array(indent).join(" ")}`;
      if (splitMsg[i] !== " ") shortLinesMsg += splitMsg[i];
    } else {
      shortLinesMsg += splitMsg[i];
    }
  }

  console.log(shortLinesMsg);
}

const fileChecksCWD = {
  node_modules:
    "It looks like there's a node_modules folder in your server root. First, build (also known as bundle, or compile) your project into a directory and run this server from there",
  "Gruntfile.js":
    "It looks like this is a Grunt based project, but you're running from the Grunt project root directory directly. You may want to run grunt build and run from the dist folder",
  "gulpfile.js":
    "It looks like this is a Gulp based project, but you're running from the Gulp project root directory directly. You may want to run gulp build and run from the dist folder"
};

function sanityCheck(dir) {
  console.log("\nServer root:", stdlibPath.resolve(dir), "\n");

  for (var file in fileChecksCWD) {
    const filePath = stdlibPath.resolve(dir, file);
    if (fs.existsSync(filePath)) {
      consolePrinter(fileChecksCWD[file], 4);
      process.exit(1);
    }
  }

  if (!fs.existsSync(stdlibPath.resolve(dir, "index.html"))) {
    consolePrinter(
      "It looks like there's no index.html file in your server root. This server is for JavaScript single page applications that require an index.html file. Make sure you're running from your build/dist directory that has an index.html file",
      4
    );

    process.exit(1);
  }
}

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
  if (options["enable-middleware-cache"]) {
    console.log("Enabling middleware-cache option");
    prerendercloud.set("enableMiddlewareCache", true);
  } else {
    consolePrinter(
      "middleware-cache is not enabled, which means every page refresh will hit the prerender.cloud API, adding ~1.5s to each request. After verifying that things are working, use --enable-middleware-cache to speed things up",
      4
    );
  }

  app.use(compression());

  app.use(prerendercloud);

  // First, check the file system
  app.use(serveStatic(directory, { extensions: ["html"], etag: false }));

  // Then, serve the fallback file
  app.use(serveStaticFile(path.join(directory, file)));

  const server = app.listen(port, host, err =>
    onStarted(err, server.address())
  );

  return server;
};
