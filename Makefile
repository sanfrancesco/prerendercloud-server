.PHONY: build publish test prettier

prettier:
	./node_modules/.bin/prettier --write "src/**/*.js"

testcrawl:
	NODE_ENV=test \
	CRAWL_HOST="example.com" \
	./node_modules/jasmine/bin/jasmine.js spec/crawlSpec.js

testintegration:
	DEBUG=prerendercloud,prerendercloudserver \
	NODE_ENV=test \
	PRERENDER_SERVICE_URL="https://service.prerender.cloud" \
	./node_modules/jasmine/bin/jasmine.js spec/integrationSpec.js

test: testcrawl testintegration

build: prettier
	npm run build
	rm -rf publish
	mkdir publish
	cp -r dist publish/
	cp README.md package.json package-lock.json publish/

npmpublish: build
	npm publish publish

dockerbuild: build
	docker build -t prerendercloud/webserver -t prerendercloud/webserver:latest -t prerendercloud/webserver:0.8.5 .

dockerpush: dockerbuild
	docker push prerendercloud/webserver
	docker push prerendercloud/webserver:latest
	docker push prerendercloud/webserver:0.8.5

# instructions to publish npm and docker:
# 1. run tests, commit changes
# 2. modify package.json version
# 3. modify Docker tag here in Makefile in dockerbuild and dockerpublish
# 4. run `make publish`
# 5. run `make dockerpush`
publish: npmpublish dockerpush