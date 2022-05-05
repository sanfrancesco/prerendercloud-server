const nock = require("nock");
const supertest = require("supertest");

const server = require("../src/index.js");
const requestWithSupertest = supertest(
  server.start({ directory: "./spec/htmltest/public", "--bots-only": true })
);

const INDEX_HTML_RAW_SOURCE =
  "<html><head><title>Hello World Title</title></head><body>Hello World Body</body></html>";

describe("root", function () {
  afterEach(function () {
    nock.cleanAll();
  });
  beforeEach(function () {
    nock.disableNetConnect();
    nock.enableNetConnect("127.0.0.1:9000");

    this.prerenderServer = nock("https://service.prerender.cloud")
      .get(/.*/)
      .reply((uri) => {
        console.log({ uri });
        this.prerenderedUri = uri;
        return [200, "body"];
      });
  });

  describe("when user-agent is prerendercloud", function () {
    beforeEach(function () {
      this.userAgent = "prerendercloud";
    });

    it("does not pre-render", async function () {
      const res = await requestWithSupertest
        .get("/")
        .set("user-agent", this.userAgent);

      expect(res.status).toEqual(200);
      expect(res.text).toEqual(INDEX_HTML_RAW_SOURCE);
    });
  });

  describe("_whitelist.js and _redirects", function () {
    function it404s() {
      it("returns 404", async function () {
        const res = await requestWithSupertest
          .get(this.requestedPath)
          .set("user-agent", this.userAgent);

        expect(res.status).toEqual(404);
        expect(res.text).toEqual("not found");
      });
    }

    [{ path: "/_redirects", ua: "prerendercloud" }].forEach(function (args) {
      describe("with prerender user-agent", function () {
        beforeEach(function () {
          this.requestedPath = args.path;
          this.userAgent = args.ua;
        });

        it404s();
      });
    });
  });

  describe("when user-agent is a bot", function () {
    beforeEach(function () {
      this.userAgent = "twitterbot";
    });

    it("pre-renders", async function () {
      const res = await requestWithSupertest
        .get("/")
        .set("user-agent", this.userAgent);

      expect(this.prerenderedUri).toEqual("/http://127.0.0.1:9000/");

      expect(res.status).toEqual(200);
      expect(res.text).toEqual("body");
    });

    describe("when path not in whitelist", function () {
      it("does not pre-render", async function () {
        const res = await requestWithSupertest
          .get("/not-in-whitelist")
          .set("user-agent", this.userAgent);

        expect(res.status).toEqual(200);
        expect(res.text).toEqual(INDEX_HTML_RAW_SOURCE);
      });
    });

    describe("when path matches regex in whitelist", function () {
      it("does not pre-render", async function () {
        const res = await requestWithSupertest
          .get("/users/1234/profile")
          .set("user-agent", this.userAgent);

        expect(this.prerenderedUri).toEqual(
          "/http://127.0.0.1:9000/users/1234/profile"
        );

        expect(res.status).toEqual(200);
        expect(res.text).toEqual("body");
      });
    });
  });

  describe("when user-agent is a human", function () {
    beforeEach(function () {
      this.userAgent =
        "Browser: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4000.00 Safari/537.36";
    });

    it("pre-renders", async function () {
      const res = await requestWithSupertest
        .get("/")
        .set("user-agent", this.userAgent);

      expect(this.prerenderedUri).toEqual(undefined);
      expect(res.status).toEqual(200);
      expect(res.text).toEqual(INDEX_HTML_RAW_SOURCE);
    });

    describe("_headers", function () {
      it("rewrites static path headers", async function () {
        const res = await requestWithSupertest
          .get("/plain-txt-file")
          .set("user-agent", this.userAgent);

        expect(res.status).toEqual(200);
        expect(res.headers["content-type"]).toEqual("text/plain");
        expect(res.text).toEqual("plain txt");
      });
      it("rewrites splat path headers", async function () {
        const res = await requestWithSupertest
          .get("/documentation")
          .set("user-agent", this.userAgent);

        expect(res.status).toEqual(200);
        expect(res.headers["content-type"]).toEqual("text/html; charset=UTF-8");
        expect(res.headers["arbitrary-header"]).toEqual("arbitrary-value");
        expect(res.text).toEqual("documentation");
      });
    });

    describe("file without extension", function () {
      it("returns content-type of octet-stream", async function () {
        const res = await requestWithSupertest
          .get("/file-no-extension")
          .set("user-agent", this.userAgent);

        expect(res.status).toEqual(200);
        expect(res.headers["content-type"]).toEqual("application/octet-stream");
        expect(res.body.toString()).toEqual("text");
      });
    });

    describe("_redirects", function () {
      it("rewrites", async function () {
        const res = await requestWithSupertest
          .get("/page200rewrite")
          .set("user-agent", this.userAgent);

        expect(res.status).toEqual(200);
        expect(res.text).toEqual("page1");
      });

      it("redirects", async function () {
        const res = await requestWithSupertest
          .get("/page301redirect")
          .set("user-agent", this.userAgent);

        expect(res.status).toEqual(301);
        expect(res.headers.location).toEqual("/page1");
        expect(res.text).toEqual("");
      });

      describe("with api", function () {
        beforeEach(function () {
          this.exampleDotComServer = nock("http://example.com/api/v1/users")
            .get(/.*/)
            .reply((uri) => {
              console.log({ uri });
              this.exampleDotComServerUri = uri;
              return [200, "example-users"];
            });
        });
        it("splat redirects", async function () {
          const res = await requestWithSupertest
            .get("/api/v1/users")
            .set("user-agent", this.userAgent);

          expect(res.status).toEqual(200);
          expect(res.text).toEqual("example-users");
        });
      });
    });
  });
});
