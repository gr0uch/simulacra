# Changelog


##### 0.10.0 (2016-01-30)
- Feature: added support for passing in a string, which is used as the argument for `querySelector`.
- Breaking change: removed `define` and `bind` on exported function, bypasses type checking in main function.


##### 0.9.2 (2016-01-29)
- Polish: if mutator function throws an error, do not set internal value.
- Polish: remove `parent` property since it is now useless.


##### 0.9.0 (2016-01-28)
- Breaking change: decided that `context` object is a bad idea, it should be as simple as possible.
- Polish: differentiate between `undefined` and `0` index.


##### 0.8.0 (2016-01-25)
- Feature: expose internal functions `define` and `bind` on the default exported function, useful for avoiding dynamic dispatch.
