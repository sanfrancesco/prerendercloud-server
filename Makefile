.PHONY: build publish test prettier

lint:
	yarn run lint

prettier: lint
	./node_modules/prettier/bin/prettier.js --write "src/**/*.js"

build: prettier
	yarn run build
	cp -r src/bin dist

# following https://booker.codes/how-to-build-and-publish-es6-npm-modules-today-with-babel/ for transpiled npm packages
publish: build
	npm publish
