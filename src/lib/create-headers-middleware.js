const Headers = require("./headers");
const fs = require("fs");
const stdlibPath = require("path");
const debug = require("debug")("prerendercloudserver");

const FILE_NAME = "_headers";

module.exports = function (directory) {
  const filePath = stdlibPath.resolve(directory, FILE_NAME);

  let parsedHeaders = null;

  try {
    parsedHeaders = Headers.from(fs.readFileSync(filePath).toString());
  } catch (err) {
    if (err.message.match("ENOENT")) {
      console.log("no _headers file was detected");
      return null;
    } else {
      throw err;
    }
  }

  if (!parsedHeaders) {
    return null;
  }

  console.log(
    `\n---\n\n${FILE_NAME} file successfully parsed`,
    parsedHeaders,
    "\n\n---\n"
  );

  return function (req, res, next) {
    const headersToApply = Headers.getHeadersForPath(parsedHeaders, req.url);
    if (!headersToApply) {
      return next();
    }

    for (headerKey in headersToApply) {
      debug(
        `setting header for path ${req.url}: ${headerKey}: ${headersToApply[headerKey]}`
      );
      res.setHeader(headerKey, headersToApply[headerKey]);
    }

    next();
  };
};
