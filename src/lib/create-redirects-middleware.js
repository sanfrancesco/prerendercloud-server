// this finds the first matching redirect, and processes it
// which means if there's a redirect from /path1 to /path2 and
// another redirect from /path2 to /path3, it will be 2 separate
// HTTP requests (this does not collapse requests)

const got = require("got-lite");
const Redirects = require("./redirects");
const fs = require("fs");
const stdlibPath = require("path");
const debug = require("debug")("prerendercloudserver");

const FILE_NAME = "_redirects";

const starPathToRegex = (starPath) =>
  new RegExp(`${starPath}`.replace(/\*/, "(.*)"));

const splatRedirectWithRegex = (redirect) =>
  Object.assign({}, redirect, {
    regex: starPathToRegex(redirect.from),
  });

const findAndRemoveFirstMatchingRedirect = function (redirects, path) {
  const foundRedirect = redirects.find((redirect) => {
    const isNormalMatch = redirect.from === path;
    const isSplatMatch = redirect.regex && path.match(redirect.regex);

    return isNormalMatch || isSplatMatch;
  });

  if (foundRedirect) {
    // rm redirect from list
    redirects.splice(redirects.indexOf(foundRedirect), 1);

    // now convert it to: {to, status}
    if (Redirects.isSplat(foundRedirect)) {
      const to = path.replace(
        foundRedirect.regex,
        foundRedirect.to.match(/splat/)
          ? `${foundRedirect.to.replace(/\:splat/, "")}$1`
          : foundRedirect.to
      );
      return { to, status: foundRedirect.status || 301 };
    } else {
      return { to: foundRedirect.to, status: foundRedirect.status || 301 };
    }
  }
  return null;
};

const redirect = function (status, to, req, res) {
  res.writeHead(status, {
    Location: to,
  });
  return res.end();
};

function handleRedirect(req, res, next) {
  const foundRedirect = findAndRemoveFirstMatchingRedirect(
    req.redirects,
    req.url
  );

  if (!foundRedirect) return next();

  if (`${foundRedirect.status}`.startsWith(3)) {
    debug("redirecting", {
      from: req.url,
      to: foundRedirect.to,
      status: foundRedirect.status,
    });
    return redirect(foundRedirect.status, foundRedirect.to, req, res);
  } else {
    const to = foundRedirect.to;

    if (to.startsWith("http")) {
      debug("streaming", {
        from: req.url,
        to: foundRedirect.to,
      });
      // proxy
      delete req.headers.referer;
      const stream = got.stream(to);
      stream.on("error", console.error);
      req.pipe(stream);
      return stream.pipe(res);
    } else {
      debug("rewriting", {
        from: req.url,
        to: foundRedirect.to,
        status: foundRedirect.status,
      });
      if (to[0] !== "/") {
        req.url = "/" + to;
      } else {
        req.url = to;
      }

      return next();
    }
  }
}

module.exports = function (directory) {
  const filePath = stdlibPath.resolve(directory, FILE_NAME);

  let redirects = [];

  try {
    redirects = Redirects.from(fs.readFileSync(filePath).toString());
  } catch (err) {
    if (err.message.match("ENOENT")) {
      console.log(` - ${FILE_NAME}    was not found (searched at ${filePath})`);
      return null;
    } else {
      throw err;
    }
  }
  if (redirects.length) {
    redirects = redirects.map((redirect) =>
      Redirects.isSplat(redirect) ? splatRedirectWithRegex(redirect) : redirect
    );
    console.log(
      `\n---\n\n${FILE_NAME} file successfully parsed`,
      redirects,
      "\n\n---\n"
    );
  }

  return function (req, res, next) {
    req.redirects = redirects.slice();
    return handleRedirect(req, res, next);
  };
};
