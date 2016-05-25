# Changelog


### 0.15.1 (2016-05-25)
- Fix: use proper variable for checking if target value is array.


### 0.15.0 (2016-05-24)
- Feature: add `target` on path object. This saves the hassle of always traversing the entire path to the local bound object.
- Polish: setting an internal value should work no matter what.


### 0.14.1 (2016-05-09)
- Polish: use non-enumerable, non-writable private properties.


### 0.14.0 (2016-04-14)
- Feature: option to use comment nodes instead of empty text nodes, useful for debugging purposes or if `Node.normalize()` is needed.


### 0.13.2 (2016-03-24)
- Polish: rename internal functions so that they do not conflict with `Function.prototype`.


### 0.13.1 (2016-03-24)
- Feature: expose `define` and `bind` again on the default export.


### 0.13.0 (2016-03-21)
- Breaking change: the mutator function must return `false` instead of any non-undefined value to prevent the DOM operation `removeChild`.


### 0.12.0 (2016-03-20)
- Feature: returning any non-undefined value from a mutator function when the Node is about to be removed prevents the automatic call to remove the Node.


### 0.11.0 (2016-03-16)
- Breaking change: the fourth argument to the mutator function is now a path, instead of index.


### 0.10.2 (2016-02-24)
- Polish: remove restriction on binding multiple keys to the same DOM node, it wasn't necessary.


### 0.10.1 (2016-01-30)
- Polish: internal renaming of variables and functions.


### 0.10.0 (2016-01-30)
- Feature: added support for passing in a string, which is used as the argument for `querySelector`.
- Breaking change: removed `define` and `bind` on exported function, bypasses type checking in main function.


### 0.9.2 (2016-01-29)
- Polish: if mutator function throws an error, do not set internal value.
- Polish: remove `parent` property since it is now useless.


### 0.9.0 (2016-01-28)
- Breaking change: decided that `context` object is a bad idea, it should be as simple as possible.
- Polish: differentiate between `undefined` and `0` index.


### 0.8.0 (2016-01-25)
- Feature: expose internal functions `define` and `bind` on the default exported function, useful for avoiding dynamic dispatch.
