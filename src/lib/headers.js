// b4: ['key1:val1', 'key2: val2']
// after: { key1: val1, key2: val2}
const parseHeaders = (arrayOfStrs) => {
  return arrayOfStrs.reduce((memo, keyValStr) => {
    const [key, val] = keyValStr.split(/\:/);
    memo[key.toLowerCase()] = val.trim();
    return memo;
  }, {});
};

const validate = (lines) => {
  const starstWithSlash = (l) => l.startsWith("/");
  const hasOneColon = (l) => {
    const matches = l.match(/:/g);
    return (matches && matches.length === 1) || false;
  };
  const invalid = lines.filter((l) => !(starstWithSlash(l) || hasOneColon(l)));
  if (invalid.length) {
    throw new UpdateAttrError(
      "the _headers file",
      "has the following malformed lines: " +
        Object.values(invalid)
          .filter((v) => v)
          .join(",")
    );
  }
};

const starPathToRegex = (starPath) =>
  new RegExp(`${starPath}`.replace(/\/?\*/, "/?(.*)"));

module.exports = class Headers {
  static from(raw) {
    return new this(raw).parse();
  }

  static getHeadersForPath({ staticPaths, splatPaths }, requestedPath) {
    if (staticPaths[requestedPath]) {
      return staticPaths[requestedPath];
    } else {
      const splatPathKey = Object.keys(splatPaths).find((path) =>
        requestedPath.match(starPathToRegex(path))
      );

      if (!splatPathKey) {
        return null;
      }

      return splatPaths[splatPathKey];
    }
  }

  constructor(raw) {
    this.raw = raw;
  }

  parse() {
    const str = this.raw.toString();

    const isComment = (line) =>
      !line.trim().match(/\/\*$/) && line.match(/^(\#|\/\/|\/\*)/);

    // 1. tokenize string by newline
    // 2. strip whitespace
    // 3. strip comments
    const lines = str
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length)
      .filter((line) => !isComment(line))
      .map((line) => line.replace(/\s+/g, " "));

    // 4. validate it
    validate(lines);

    // 5. reverse it
    lines.reverse();

    const staticPaths = {};
    const splatPaths = {};

    let last = 0;
    lines.forEach((line, i) => {
      if (line.startsWith("/")) {
        const path = line;
        const headers = parseHeaders(lines.slice(last, i));

        if (path.endsWith("*")) {
          splatPaths[path] = headers;
        } else {
          staticPaths[path] = headers;
        }

        last = i + 1;
      }
    });

    return { staticPaths, splatPaths };
  }
};
