const optionsMap = {
  "--debug": "debug",
  "--enable-middleware-cache": "enableMiddlewareCache",
  "--meta-only": "metaOnly",
  "--bots-only": "botsOnly",
  "--ignore-all-query-params": "ignoreAllQueryParams",
  "--remove-trailing-slash": "removeTrailingSlash",
  "--disable-ajax-preload": "disableAjaxPreload",
  "--disable-ajax-bypass": "disableAjaxBypass",
  "--disable-head-dedupe": "disableHeadDedupe",
  "--remove-script-tags": "removeScriptTags",
  "--wait-extra-long": "waitExtraLong",
  "--follow-redirects": "followRedirects",
  "--bubble-up-5xx-errors": "bubbleUp5xxErrors",
  "--throttle-on-fail": "throttleOnFail",
  "--crawl-whitelist-on-boot": "--crawl-whitelist-on-boot",
};

module.exports = optionsMap;
