# Commands
BUILD_CMD = node_modules/sigil-cli/sigil
FORMAT_CMD = node_modules/.bin/uglifyjs
BUNDLE_CMD = node_modules/.bin/browserify
NODE_CMD = node
NPM_CMD = npm

# Directories
SRC_DIR = src/
DIST_DIR = dist/

# Git
REPO_GIT = git@github.com:daliwali/simulacra.git

# Phonies
.PHONY: web clean


all: web


web:
	mkdir -p $(DIST_DIR)
	$(BUILD_CMD) \
		-I $(SRC_DIR) \
		$(SRC_DIR)main.lisp \
		| $(FORMAT_CMD) -b indent_level=2 \
		> $(DIST_DIR)index.js


clean:
	rm -rf $(DIST_DIR)
