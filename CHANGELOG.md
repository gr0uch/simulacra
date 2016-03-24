# Changelog


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
