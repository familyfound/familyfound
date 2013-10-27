REPORTER = spec
stylus_files := $(wildcard assets/styl/*.styl)
javascript_files := $(wildcard assets/*.js)
template_files := $(patsubst assets/jade/%.jade,static/%.html,$(wildcard assets/jade/*.jade))

default: build/build.js
	@:

heroku: local_build
	@DEBUG=familyfound:*,familysearch:* node app.js

build/build.js: static/index.html $(stylus_files) $(javascript_files)
	@echo "Component build"
	@component build --dev --use component-stylus-plugin

local_build: node_modules components static/index.html $(stylus_files) $(javascript_files)
	@./node_modules/.bin/component build --dev --use component-stylus-plugin

components: component.json
	@./node_modules/.bin/component install

node_modules: package.json
	@npm install

serve: default
	nodemon app.js

static/index.html: $(wildcard assets/jade/*.jade) assets/pages.js
	@echo "Jade"
	@./build.js

test: lint

lint:
	./node_modules/.bin/jshint lib routes *.js assets --verbose

clean:
	@rm -rf node_modules components

.PHONY: test clean serve heroku local_build lint
