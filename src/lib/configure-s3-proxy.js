const s3Proxy = require("s3-proxy");

module.exports = (expressapp, bucket, key, secret) => {
  // create an express API since
  // we're using connect as opposed to express
  // and s3-proxy expects express API
  expressapp.use((req, res, next) => {
    req.path = req.originalUrl;
    // this is the mount path (i.e. app.get('/media/*') would have baseUrl of /media/)
    req.baseUrl = "";

    // s3-proxy uses this for base64 encoding
    req.acceptsEncodings = () => false;
    req.app = { settings: {} };
    res.set = (key, val) => res.setHeader(key, val);

    res.status = (code) => {
      res.statusCode = code;
      return res;
    };

    res.send = (body) => res.end(body);
    next();
  });
  expressapp.use((req, res, next) => {
    // the s3-proxy lib doesn't make assumptions about / equating to /index.html
    // so we have to do it ourselves
    if (req.path.endsWith("/")) {
      req.path += "index.html";
      req.originalUrl += "index.html";
    } else if (req.path.startsWith("/?")) {
      req.path = req.path.replace(/\/\?/, "/index.html?");
      req.originalUrl = req.originalUrl.replace(/\/\?/, "/index.html?");
    }
    next();
  });

  expressapp.use(
    s3Proxy({
      bucket: bucket,
      accessKeyId: key,
      secretAccessKey: secret,
    })
  );

  // serve fallback file (index.html)
  expressapp.use((err, req, res, next) => {
    if (err && err.code === "missingS3Key") {
      console.log("falling back to index.html since", req.path, "returned 404");

      req.path = "/index.html";
      req.originalUrl = "/index.html";

      return s3Proxy({
        bucket: bucket,
        accessKeyId: key,
        secretAccessKey: secret,
      })(req, res, next);
    }
    console.log({ err });
    next(err);
  });

  // if not even fallback file exists, serve 404
  expressapp.use((err, req, res, next) => {
    if (err && err.code === "missingS3Key") {
      return res.status(404).send("404 Not Found");
    }
    console.log({ err });
    next(err);
  });
};
