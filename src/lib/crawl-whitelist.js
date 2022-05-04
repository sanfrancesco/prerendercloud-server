const got = require("got-lite");
const CONCURRENCY = 2;

const crawl = (host, path) => {
  const url = `https://${host}${path}`;
  console.log("crawling", url);

  const start = new Date();
  return got(url, { headers: { "user-agent": "googlebot" } }).then(() => {
    return [url, new Date() - start];
  });
};

// https://stackoverflow.com/a/58686835
async function concurrentCrawl(host, paths, concurrency) {
  const results = [];
  while (paths.length) {
    await Promise.all(
      paths
        .splice(0, concurrency)
        .map((p) => crawl(host, p).then((res) => results.push(res)))
    );
  }
  return results;
}

function crawlWhitelist(host, whitelist) {
  // only support strings for crawling despite the array including regexes
  const pathsToCrawl = whitelist.filter((p) => typeof p === "string");

  console.log("--crawl-whitelist-on-boot enabled for string paths", {
    host,
    totalPaths: pathsToCrawl.length,
  });

  return concurrentCrawl(host, pathsToCrawl, CONCURRENCY);
}

module.exports = crawlWhitelist;

// example
// crawlWhitelist("prerender.cloud", [
//   "/docs",
//   "/pricing",
//   "/support",
//   "/blog",
//   "/blog/2020/06/02/react-vs-angular",
//   "/blog/2018/05/31/crawl-meta-tags",
//   "/blog/2017/06/22/chrome-59-is-sometimes-slower",
// ]).then(console.log);
