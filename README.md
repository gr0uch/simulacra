# [Simulacra.js](http://simulacra.js.org/)
[![Build Status](https://img.shields.io/travis/0x8890/simulacra/master.svg?style=flat-square)](https://travis-ci.org/0x8890/simulacra)
[![npm Version](https://img.shields.io/npm/v/simulacra.svg?style=flat-square)](https://www.npmjs.com/package/simulacra)
[![License](https://img.shields.io/npm/l/simulacra.svg?style=flat-square)](https://raw.githubusercontent.com/0x8890/simulacra/master/LICENSE)

Simulacra.js provides one-way data binding from plain JavaScript objects to the DOM, with an emphasis on performance. Its size is roughly ~450 LOC, or ~3 KB (min+gz), and it has no dependencies. Get it from `npm`:

```sh
$ npm i simulacra --save
```


## Synopsis

Simulacra.js makes the DOM react to changes in data. When data changes, it maps those changes to the DOM by adding and removing elements and invoking *change* functions, which by default, assign plain text and form input values.

Fundamentally, it is a low-cost abstraction over the DOM that optimizes calls to `Node.insertBefore` and `Node.removeChild`. Its performance is comparable to hand-written DOM manipulation code, see the [benchmarks](#benchmarks).


## Usage

Simulacra.js uses plain old HTML for templating, and it does not require meta-information in the template at all. Here's a sample template:

```html
<template id="product">
  <h1 class="name"></h1>
  <div class="details">
    <div><span class="size"></span></div>
    <h4 class="vendor"></h4>
  </div>
</template>
```

Using the `<template>` tag is optional but optimal since its contents are not rendered by default, but any DOM element will suffice. The shape of the data is important since it has a straightforward mapping to the DOM, and arrays are iterated over to output multiple DOM elements. Here's some sample data:

```js
var data = {
  name: 'Pumpkin Spice Latte',
  details: {
    size: [ 'Tall', 'Grande', 'Venti' ],
    vendor: 'Starbucks'
  }
}
```

Simulacra.js exports only a single function, which binds an object to the DOM. The first argument must be a singular object, and the second argument is a data structure that defines the bindings. The definition must be a single value or an array with at most three elements:

- **Index 0**: either a DOM element or a CSS selector string.
- **Index 1**: either a nested definition array, or a *change* function.
- **Index 2**: if index 1 is a nested definition, this should be an optional *mount* function.

```js
var simulacra = require('simulacra') // or `window.simulacra`
var fragment = document.getElementById('product').content

var node = simulacra(data, [ fragment, {
  name: '.name',
  details: [ '.details', {
    size: '.size',
    vendor: '.vendor'
  } ]
} ])

document.body.appendChild(node)
```

The DOM will update if any of the bound keys are assigned a different value, or if any `Array.prototype` methods on the value are invoked. Arrays and single values may be used interchangeably, the only difference is that Simulacra.js will iterate over array values.


## Change Function

By default, the value will be assigned to the element's `textContent` property (or `value` or `checked` for inputs). A user-defined *change* function may be passed for arbitrary element manipulation, and its return value may affect the value used in the default behavior. The *change* function may be passed as the second position, it has the signature (`element`, `value`, `previousValue`, `path`):

- **`element`**: the local DOM element.
- **`value`**: the value assigned to the key of the bound object.
- **`previousValue`**: the previous value assigned to the key of the bound object.
- **`path`**: an array containing the full path to the value. For example: `[ 'users', 2, 'email' ]`. Integer values indicate array indices. The root object is accessible at the `root` property of the path array, i.e. `path.root`, and the deepest bound object is accessible at the `target` property, i.e. `path.target`.

To manipulate an element in a custom way, one may define a *change* function like so:

```js
[ element || selector, function change (element, value) {
  return 'Hi ' + value + '!'
} ]
```

A *change* function can be determined to be an insert, mutate, or remove operation based on whether the value or previous value is `null`:

- **Value but not previous value**: insert operation.
- **Value and previous value**: mutate operation.
- **No value**: remove operation.

There are some special cases for the *change* function:

- If the bound element is the same as its parent, its value will not be iterated over if it is an array, and its return value will have no effect.
- If the *change* function returns `simulacra.retainElement` for a remove operation, then `Node.removeChild` will not be called. This is useful for implementing animations when removing an element from the DOM.


## Mount Function

A *mount* function can be defined as the third position. Its signature is similar to the *change* function, except that it does not provide `previousValue`. Instead, it can be determined if there was a mount or unmount based on whether `value` is an object or `null`.

```js
[ element || selector, { ... }, function mount (element, value) {
  if (value !== null) {
    // Mounting an element, maybe attach event listeners here.
  }
  else {
    // Unmounting an element, may return `simulacra.retainElement`
    // to skip removal from the DOM.
  }
} ]
```

If the *mount* function returns `simulacra.retainElement` for an unmount, it will skip removing the element from the DOM. This is useful for implementing animations.


## State Management

Since Simulacra.js is intended to be deterministic, the bound object can be cloned at any point in time and bound again to reset to that state. For example, using the `clone` module:

```js
var clone = require('clone')
var simulacra = require('simulacra')

var data = { ... }, bindings = [ ... ]

var node = simulacra(data, bindings)
var initialData = clone(data)

// Do some mutations, and then reset to initial state.
node = simulacra(initialData, bindings)
```

This is just one way to implement time travel, but not the most efficient.


## Benchmarks

Simulacra.js is comparable to directly calling `Node.appendChild` in terms of DOM rendering. Based on the [benchmarks](https://lhorie.github.io/mithril/benchmarks.html) from Mithril.js, here's how it compares. Tests ran on a Linux desktop using Chromium. Only loading, scripting, rendering, and aggregate times are shown.

| Name              | Loading  | Scripting  | Rendering  | Aggregate  |
|:------------------|:---------|:-----------|:-----------|:-----------|
| *appendChild*     | 10 ms    | 3 ms       | 13 ms      | 38 ms      |
| Simulacra.js      | 9 ms     | 9 ms       | 13 ms      | 39 ms      |
| React.js          | 23 ms    | 76 ms      | 13 ms      | 129 ms     |
| Mithril.js        | 16 ms    | 77 ms      | 23 ms      | 165 ms     |
| Backbone          | 20 ms    | 106 ms     | 23 ms      | 191 ms     |
| jQuery            | 20 ms    | 119 ms     | 24 ms      | 211 ms     |
| Angular.js        | 17 ms    | 159 ms     | 24 ms      | 295 ms     |

To run the benchmarks, you will have to clone the repository and build it by running `npm run build`. The benchmarks are located [here](https://github.com/0x8890/simulacra/tree/master/benchmark).


## How it Works

On initialization, Simulacra.js removes bound elements from the document and replaces them with an empty text node (marker) for memoizing its position. Based on a value in the bound data object, it clones template elements and applies the *change* function on the cloned elements, and appends them near the marker or adjacent nodes.

When a bound key is assigned, it gets internally casted into an array if it is not an array already, and the values of the array are compared with previous values. Based on whether a value at an index has changed, Simulacra.js will remove, insert, or mutate a DOM element corresponding to the value. This is faster and simpler than diffing changes between DOM trees.


## Caveats

- The `delete` keyword will not trigger a DOM update. Although ES6 `Proxy` has a trap for this keyword, its browser support is lacking and it can not be polyfilled. Also, it would break the API of Simulacra.js for this one feature, so the recommended practice is to set the value to `null` rather than trying to `delete` the key.
- Out-of-bounds array index assignment will not work, because the number of setters is equal to the length of the array.
- The bound data object may not contain any conflicting getters & setters, since they will be overridden by Simulacra.js.
- Using `bind`, `call`, `apply`, with `Array.prototype` on bound arrays won't work, because the bound arrays implement instance methods.


## Under the Hood

This library is written in ES5 syntactically, and makes use of:

- **Object.defineProperty** (ES5): used for binding keys on objects.
- **WeakMap** (ES6): memory efficient mapping of DOM nodes.

It makes use of these DOM API features:

- **Node.insertBefore** (DOM Level 1): used for inserting document fragments.
- **Node.appendChild** (DOM Level 1): used for inserting elements in to document fragments.
- **Node.removeChild** (DOM Level 1): used for removing elements.
- **TreeWalker** (DOM Level 2): fast iteration through DOM nodes.
- **Document.createDocumentFragment** (DOM Level 2): used for bulk insertions.
- **Node.isEqualNode** (DOM Level 3): used for equality checking after cloning nodes.
- **Node.contains** (DOM Living Standard): used for checking if bound elements are valid.

No shims are included. At the bare minimum, it works in IE9+ with a WeakMap polyfill, but otherwise it should work in IE11+.


## Server-Side Rendering

Simulacra.js works in Node.js (it's isomorphic!), with one thing to keep in mind: it should be called within the context of the `window` global, however this may be optional in some implementations. This is most easily done by using `Function.prototype.bind`, although `Function.prototype.call` is more performant. In the following example, [Domino](https://github.com/fgnass/domino) is used as the DOM implementation.

```js
const domino = require('domino')
const simulacra = require('simulacra')

const window = domino.createWindow('<h1></h1>')
const $ = simulacra.bind(window)
const data = { message: 'Hello world!' }
const binding = [ 'body', {
  message: 'h1'
} ]

console.log($(data, binding).innerHTML)
```

This will print the string `<h1>Hello world!</h1>` to `stdout`.


## License

This software is licensed under the [MIT license](https://raw.githubusercontent.com/0x8890/simulacra/master/LICENSE).
