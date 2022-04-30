.PHONY: build publish test prettier

prettier:
	./node_modules/.bin/prettier --write "src/**/*.js"

build: prettier
	npm run build
	cp -r src/bin dist
	rm -rf publish
	mkdir publish
	cp -r dist publish/
	cp README.md package.json publish/

# following https://booker.codes/how-to-build-and-publish-es6-npm-modules-today-with-babel/ for transpiled npm packages
publish: build
	npm publish publish

dockerbuild: build
	docker build -t prerendercloud/webserver:latest .

dockerpush:
	docker push prerendercloud/webserver
