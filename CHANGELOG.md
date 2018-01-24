# Changelog


### 2.1.12 (2018-01-24)
- Fix: broken edge case for nested parent binding.


### 2.1.11 (2018-01-21)
- Fix: remove broken feature to pass in a DOM Node in a binding. The reason why a selector must be used is because passing in a DOM Node by reference won't work due to internal use of cloning nodes, it must be possible to get a reference a node based on a selector.


### 2.1.9 (2017-08-30)
- Fix: optimistically set memoized values everywhere to be consistent.


### 2.1.8 (2017-08-19)
- Polish: check for `undefined` value in parent change function, replace with `null`.


### 2.1.7 (2017-07-30)
- Fix: safer escaping in render function when setting attributes.


### 2.1.6 (2017-07-30)
- Fix: `textarea` should not have value replaced, but rather set its inner text.
- Fix: safer escaping in render function.
- Polish: add more element attributes in render function.


### 2.1.5 (2017-07-14)
- Fix: add `textContent` to rendering DOM subset.


### 2.1.4 (2017-07-14)
- Optimization: the browser version now strips empty text nodes from the template before processing.


### 2.1.3 (2017-07-13)
- Benchmark: add a realistic server-side rendering example/benchmark.
- Fix: a few severe bugs fixed in the server-side rendering function.
- Optimization: improve server-side rendering performance by serializing more static nodes.
- Optimization: normalize nodes by default.


### 2.1.2 (2017-07-05)
- Polish: add entry point for optional helpers at `simulacra/helpers`.
- Polish: add `package-lock.json`.


### 2.1.1 (2017-05-03)
- Refactor: improve packaging.
- Refactor: don't make functions in a loop.


### 2.1.0 (2017-05-03)
- Feature: add string rendering function for Node.js, to improve performance.


### 2.0.6 (2017-04-23)
- Fix: allow internal properties to be configured, fixed a problem with rehydration.


### 2.0.5 (2017-04-20)
- Refactor: remove dependency on `WeakMap`.
- Polish: ignore events on child nodes after the parent has been retained.


### 2.0.4 (2017-04-07)
- Optimization: prefer `appendChild` over `insertBefore` if possible.
- Polish: re-use of rehydrated comment nodes.


### 2.0.3 (2017-03-10)
- Improvement: stricter check for adjacent nodes so that they are not allowed.


### 2.0.2 (2017-02-25)
- Fix: IE11 compatibility problems.
- Fix: Windows scripting compatibility.


### 2.0.1 (2017-01-09)
- Polish: include `dist/*.js` in package.


### 2.0.0 (2017-01-03)
- **Breaking change**: removed `flow` helper.
- **Breaking change**: removed `setDefault` helper.
- **Breaking change**: removed array indices from `path` argument.


### 1.5.7 (2016-12-14)
- Fix: default input event binding did not work in some cases.
- Fix: typo in internal function `findTarget`.


### 1.5.6 (2016-11-22)
- Polish: slightly improve safety of default behavior by checking around the text node.


### 1.5.5 (2016-11-06)
- Optimization: re-introduce insertion optimization, there was previously a bug that is now fixed.


### 1.5.4 (2016-11-06)
- Optimization: removed document fragment implementation, it was actually slower.


### 1.5.3 (2016-11-06)
- Optimization: the default behavior for setting text should be significantly faster.
- Revert: insertion optimizations, they were too fragile.


### 1.5.2 (2016-11-05)
- Fix: edge case bug when removing objects from an array.
- Optimization: slightly improved insertion performance.


### 1.5.1 (2016-10-24)
- Polish: when using selector strings, match all elements and remove all but the first one. This makes it more feasible to take a full static page and use it as a template.


### 1.5.0 (2016-10-16)
- Feature: add optional third argument `node` to main function, which allows for rehydrating from existing DOM.
- Polish: animate helper checks if node is already appended to DOM before initializing `MutationObserver`.


### 1.4.5 (2016-10-07)
- Polish: rename `chain` to `flow`, add alias for `chain`. This naming is more consistent in behavior from other libraries such as Lodash.


### 1.4.4 (2016-09-30)
- Polish: auto-detect presence of `content` attribute, useful for selecting template tags.


### 1.4.3 (2016-09-26)
- Polish: add second argument `path` to `bindEvents` event listener functions, useful for changing data within the event listener without a reference to the bound data object.


### 1.4.2 (2016-09-21)
- Fix: `animate` helper should use MutationObserver to detect DOM insertion. This fixes insert animations in Firefox.


### 1.4.1 (2016-09-15)
- Polish: add some compatibility checks in the helper functions.


### 1.4.0 (2016-09-15)
- Feature: add built-in helper functions for common use cases.
- Feature: add `simulacra.setDefault`, as a basic no-op function.
- Feature: add `simulacra.bindEvents`, for handling events bound to an element.
- Feature: add `simulacra.animate`, for handling animations via CSS classes.
- Feature: add `simulacra.chain`, for chaining helper functions.


### 1.3.2 (2016-09-09)
- Polish: prefer `input` event over `change` in default event binding, which is more synchronous.


### 1.3.1 (2016-08-27)
- Polish: use boolean checked attribute.


### 1.3.0 (2016-08-27)
- Feature: inputs and textareas by default set updated values on change, which is a more useful default. Custom change functions may override this.
- Fix: edge case bug where `path.target` is undefined.


### 1.2.7 (2016-08-15)
- Polish: simplify handling of `undefined` values by casting them all to `null`.
- Polish: allow return value in change function that is bound to parent.


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
