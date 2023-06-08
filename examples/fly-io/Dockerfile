FROM prerendercloud/webserver:latest
COPY build /wwwroot
CMD ["--enable-middleware-cache", "--ignore-all-query-params", "--crawl-whitelist-on-boot", "--disable-ajax-bypass"]
