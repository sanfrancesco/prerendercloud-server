module.exports = class Redirects {
  static isSplat(redirect) {
    return redirect.from.match(/\*/);
  }

  static from(raw) {
    return new this(raw).parse();
  }

  constructor(raw) {
    this.raw = raw;
  }

  // before: /path1 /path2 statusCode
  // after: { from, to, status }
  parse() {
    const str = this.raw.toString();

    const isComment = line => line.match(/^(\#|\/\/|\/\*)/);
    const isValidRedirect = redirect => {
      if (redirect.status && isNaN(parseInt(redirect.status))) return false;

      if (!redirect.from) return false;
      if (!redirect.from.startsWith("/")) return false;
      if (!redirect.to) return false;
      if (!(redirect.to.startsWith("/") || redirect.to.startsWith("http")))
        return false;

      if (this.constructor.isSplat(redirect)) {
        // splat's from shouldn't have anything after *
        const fromMatches = redirect.from.match(/\*(.*)/);
        if (fromMatches && fromMatches[1]) return false;

        // splat's to shouldn't have anything after :splat
        const toMatches = redirect.to.match(/\:splat(.*)/);
        if (toMatches && toMatches[1]) return false;
      }

      return true;
    };

    const lines = str
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length)
      .filter(line => !isComment(line))
      .map(line => line.replace(/\s+/g, " "));

    const redirects = lines.map(line => {
      const [from, to, status] = line.split(/\s/);
      return {
        from,
        to,
        status: status ? parseInt(status) || status : undefined
      };
    });

    const invalid = redirects.find(redirect => !isValidRedirect(redirect));
    if (invalid) {
      throw new Error(
        "the _redirects file has the following malformed lines: " +
          Object.values(invalid).filter(v => v).join(" ")
      );
    }

    return redirects;
  }

  validate() {}
};
