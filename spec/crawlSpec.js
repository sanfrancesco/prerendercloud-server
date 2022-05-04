const nock = require("nock");
nock.disableNetConnect();

describe("crawl on boot", function () {
  it("crawls strings in _whitelist.js", async function () {
    const crawledPaths = [];
    nock("https://example.com:443")
      .get(/.*/)
      .times(2)
      .reply((uri) => {
        console.log({ uri });
        crawledPaths.push(uri);
        return [200, "example-dot-com"];
      });

    const server = require("../src/index.js");
    const bootedServer = await server.start({
      directory: "./spec/htmltest/public",
      "--crawl-whitelist-on-boot": true,
    });

    expect(crawledPaths).toEqual(["/", "/docs"]);
  });
});
