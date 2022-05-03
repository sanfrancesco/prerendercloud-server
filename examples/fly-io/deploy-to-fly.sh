cp _whitelist.js _redirects build/
docker build .
flyctl deploy