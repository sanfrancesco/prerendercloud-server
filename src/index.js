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

const fileChecksCWD = {
  node_modules:
    "It looks like there's a node_modules folder in your server root.\n" +
      "First, build (also known as bundle, or compile) your project into\n" +
      "a directory and run this server from there\n",
  "Gruntfile.js":
    "It looks like this is a Grunt based project, but you're running from the Grunt\n" +
      "project root directory directly.\n" +
      "You may want to run grunt build and run from the dist folder",
  "gulpfile.js":
    "It looks like this is a Gulp based project, but you're running from the Gulp\n" +
      "project root directory directly.\n" +
      "You may want to run gulp build and run from the dist folder"
};

function sanityCheck(dir) {
  console.log("Server root:", stdlibPath.resolve(dir));

  for (var file in fileChecksCWD) {
    const filePath = stdlibPath.resolve(dir, file);
    if (fs.existsSync(filePath)) {
      console.log(fileChecksCWD[file]);
      process.exit(1);
    }
  }

  if (!fs.existsSync(stdlibPath.resolve(dir, "index.html"))) {
    console.log(
      "It looks like there's no index.html file in your server root.\n" +
        "This server is for JavaScript single page applications that require an index.html file.\n" +
        "Make sure you're running from your build/dist directory that has an index.html file"
    );
    process.exit(1);
  }
}

exports.start = function(options, _onStarted) {
  console.log("\n");

  options = options || {};

  if (options.debug) {
    process.env["DEBUG"] = "prerendercloud";
  }

  const prerendercloud = require("prerendercloud");
  prerendercloud.set("disableServerCache", true);
  if (options["enable-middleware-cache"]) {
    console.log("Enabling middleware-cache option");
    prerendercloud.set("enableMiddlewareCache", true);
  }

  let port = options.port || process.env.PORT || PORT;
  let directory = options.directory || DIRECTORY;
  let file = FILE;
  let host = options.host || HOST;
  let onStarted = _onStarted || function() {};

  sanityCheck(directory);

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
