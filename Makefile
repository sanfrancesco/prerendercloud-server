.PHONY: build publish test prettier

prettier:
	./node_modules/.bin/prettier --write "src/**/*.js"

test:
	DEBUG=prerendercloud,prerendercloudserver \
	NODE_ENV=test \
	PRERENDER_SERVICE_URL="https://service.prerender.cloud" \
	./node_modules/jasmine/bin/jasmine.js

build: prettier
	npm run build
	rm -rf publish
	mkdir publish
	cp -r dist publish/
	cp README.md package.json package-lock.json publish/

# following https://booker.codes/how-to-build-and-publish-es6-npm-modules-today-with-babel/ for transpiled npm packages
publish: build
	npm publish publish

dockerbuild: build
	docker build -t prerendercloud/webserver:latest .
	docker build -t prerendercloud/webserver:0.8.2 .

dockerpush:
	docker push prerendercloud/webserver:latest
	docker push prerendercloud/webserver:0.8.2
