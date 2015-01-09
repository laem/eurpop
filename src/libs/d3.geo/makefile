LIBRARY_FILES = \
    node_modules/d3/src/start.js \
    node_modules/d3/src/geo/path.js \
    node_modules/d3/src/end.js



lib.js: $(LIBRARY_FILES)
	node_modules/.bin/smash $(LIBRARY_FILES) | sed -e "s/d3/d3f/g" > d3f.js
