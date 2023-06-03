const fs = require("fs");
const path = require("path");

const FILE_NAME = "_whitelist.js";

module.exports = function (directory) {
  const filePath = path.resolve(directory, FILE_NAME);

  try {
    const whitelistedPaths = require(filePath);

    whitelistedPaths.forEach((path) => {
      if (!(path instanceof RegExp || typeof path === "string")) {
        throw new Error(
          `${FILE_NAME} must be array of regex or string. Found non-regex, non-string: ${path}`
        );
      }

      if (typeof path === "string" && !path.startsWith("/")) {
        throw new Error(`${FILE_NAME} string paths must start with a slash: /`);
      }
    });

    if (whitelistedPaths.length) {
      console.log(
        `\n---\n\n${FILE_NAME} file successfully parsed`,
        whitelistedPaths,
        "\n\n---\n"
      );
    }

    return whitelistedPaths;
  } catch (err) {
    if (err.message.match(/Cannot find module/i)) {
      console.log(` - ${FILE_NAME} was not found (searched at ${filePath})`);
    } else {
      throw err;
    }
  }
};
