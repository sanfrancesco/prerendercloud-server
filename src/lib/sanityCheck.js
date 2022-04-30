const consolePrinter = require("./consolePrinter");
const stdlibPath = require("path");
const fs = require("fs");

const fileChecksCWD = {
  node_modules:
    "It looks like there's a node_modules folder in your server root. First, build (also known as bundle, or compile) your project into a directory and run this server from there",
  "Gruntfile.js":
    "It looks like this is a Grunt based project, but you're running from the Grunt project root directory directly. You may want to run grunt build and run from the dist folder",
  "gulpfile.js":
    "It looks like this is a Gulp based project, but you're running from the Gulp project root directory directly. You may want to run gulp build and run from the dist folder",
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

module.exports = sanityCheck;
