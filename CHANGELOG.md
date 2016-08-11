# Changelog


### 1.2.5 (2016-08-11)
- Fix: bug in adjacent node safety check.
- Optimization: prefer `for..in` instead of `Object.keys`.


### 1.2.4 (2016-08-02)
- Polish: value should not be internally set if there was an error in the change function.


### 1.2.3 (2016-07-16)
- Optimization: remove unnecessary check in setter function.
- Polish: return value when parent is bound should now be consistent.


### 1.2.2 (2016-07-14)
- Optimization: remove unnecessary closure, improving performance.


### 1.2.1 (2016-07-10)
- Fix: allow re-use of bindings again, by internally cloning binding before re-use.


### 1.2.0 (2016-07-10)
- Feature: shorthand for binding to parent node is now just defining a change function or definition object, no CSS selector string or DOM Node required.


### 1.1.2 (2016-07-09)
- Fix: disallow re-use of bindings, it doesn't work anyways.


### 1.1.1 (2016-07-05)
- Fix: error messaging in feature detection.


### 1.1.0 (2016-07-02)
- Feature: no more mention of *mount* function, it now has the same signature as *change* functions.


### 1.0.18 (2016-06-30)
- Polish: improve feature detection.


### 1.0.16 (2016-06-22)
- Polish: avoid checking bindings again if they were already used before.
- Polish: freeze bindings for change functions.
- Polish: add test for re-using a binding.


### 1.0.15 (2016-06-21)
- Fix: bug in `splice` which mutated internal state incorrectly.


### 1.0.14 (2016-06-18)
- Polish: freeze all bindings.
- Polish: use internal WeakMap for markers instead of hidden property.


### 1.0.13 (2016-06-18)
- Fix: array mutators on arrays of objects should work.
- Fix: remove checks for already bound objects.
- Polish: freeze bindings after they are used.


### 1.0.12 (2016-06-18)
- Fix: remove runtime safety checks, they were causing other problems and weren't performant.
- Fix: remove redundant setter call in array mutators.


### 1.0.11 (2016-06-16)
- Polish: improve runtime safety checks.
- Polish: try to use symbols for internal private properties.


### 1.0.10 (2016-06-16)
- Polish: internal code deduplication by extracting copied and pasted code into functions.


### 1.0.9 (2016-06-16)
- Polish: add runtime safety checks for re-assigning bound objects and arrays.


### 1.0.8 (2016-06-16)
- Fix: edge case in array index setter which would not insert a new node if needed.


### 1.0.7 (2016-06-13)
- Fix: prevent error in Internet Explorer due to bad DOM API call.
- Fix: do some micro-optimization. Avoid creating document fragments when not needed, and remove internal `checkValue` function.


### 1.0.5 (2016-06-05)
- Polish: some build tools such as Webpack mangle the function named `define`, this has been renamed internally to avoid compatibility problems with build tools, but this is actually their fault.


### 1.0.4 (2016-06-04)
- Polish: rename ESLint configuration.


### 1.0.3 (2016-06-01)
- Fix: `unshift` order was reversed, now inserts in correct order.
- Fix: `push` was broken due to subtle variable assignment problem, now fixed.


### 1.0.2 (2016-06-01)
- Polish: improve performance by using `DocumentFragment` on bulk insertions.


### 1.0.1 (2016-05-31)
- Polish: add more type checking validations in main function.


### 1.0.0 (2016-05-30)
- Breaking change: remove `defineBinding` function, now the default exported function does only one thing: binding an object to the DOM.
- Breaking change: removed `return false` behavior to retain DOM element, it should instead return `simulacra.retainElement`.
- Feature: change function may accept a return value, which sets `textContent`, `value`, or `checked`. Returning `undefined` will have no effect.
- Polish: rename *mutator* function to *change* function.


### 0.16.1 (2016-05-26)
- Polish: remove redundant logic in mutator function.


### 0.16.0 (2016-05-26)
- Feature: add mount function for nested definitions as a third argument.


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
