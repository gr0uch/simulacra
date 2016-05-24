# [Simulacra.js](http://simulacra.js.org/)

[![Build Status](https://img.shields.io/travis/0x8890/simulacra/master.svg?style=flat-square)](https://travis-ci.org/0x8890/simulacra)
[![npm Version](https://img.shields.io/npm/v/simulacra.svg?style=flat-square)](https://www.npmjs.com/package/simulacra)
[![License](https://img.shields.io/npm/l/simulacra.svg?style=flat-square)](https://raw.githubusercontent.com/0x8890/simulacra/master/LICENSE)

Simulacra.js provides one-way data binding from plain JavaScript objects to the DOM. Its size is roughly ~300 LOC, or ~3 KB (min+gz), and it has no dependencies. Get it from `npm`:

```sh
$ npm i simulacra --save
```


## Synopsis

Simulacra.js makes the DOM react to changes in data. When data changes, it maps those changes to the DOM by adding and removing elements after invoking mutator functions, which by default, assign plain text and form input values.

Fundamentally, it is a low-cost abstraction over the DOM that optimizes calls to `Node.insertBefore` and `Node.removeChild`. Its performance is comparable to hand-written DOM manipulation code, see the [benchmarks](#benchmarks).


## Usage

Simulacra.js uses plain old HTML for templating, and where it shines is that it does not require meta-information in the template at all. For example, the binding is not declared in the template, and there is no loop construct, because it's not necessary. Here's a sample template:

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

Simulacra.js exports only a single function, which can either define bindings to the DOM, or apply bindings to an object. If the first argument is an object, it will try to bind the second argument onto the object. If the first argument is either a DOM Node or a CSS selector string, it will return a definition object that is used by Simulacra.js internally, and the second argument then defines either a nested definition or a mutator function. This can be combined in a single expression:

```js
var $ = require('simulacra') // or `window.simulacra`

var fragment = document.getElementById('product').content

var content = $(data, $(fragment, {
  name: $('.name'),
  details: $('.details', {
    size: $('.size'),
    vendor: $('.vendor')
  })
}))

document.body.appendChild(content)
```

The DOM will update if any of the bound keys are assigned a different value, or if any `Array.prototype` methods on the value are invoked. Arrays and single values may be used interchangeably, the only difference is that Simulacra.js will iterate over array values.

By default, the value will be assigned to the element's `textContent` property (or `value` or `checked` for inputs), a user-defined mutator function may be used for arbitrary element manipulation. The mutator function may be passed as the second argument to Simulacra.js, it has the signature (`node`, `value`, `previousValue`, `path`):

- `node`: the local DOM node.
- `value`: the value assigned to the key of the bound object.
- `previousValue`: the previous value assigned to the key of the bound object.
- `path`: an array containing the full path to the value. For example: `[ 'users', 2, 'email' ]`. Integer values indicate array indices. The root object is accessible at the `root` property of the path array, i.e. `path.root`, and the deepest bound object is accessible at the `target` property, i.e. `path.target`.

To manipulate a node in a custom way, one may define a mutator function like so:

```js
$(node || selector, function mutator (node, value) {
  node.textContent = 'Hi ' + value + '!'
})
```

A mutator function can be determined to be an insert, mutate, or remove operation based on whether the value or previous value is `null`:

- Value but not previous value: insert operation.
- Value and previous value: mutate operation.
- No value: remove operation.

There are some special cases for the mutator function:

- If the bound node is the same as its parent, its value will not be iterated over if it is an array.
- If the mutator function returns `false` for a remove operation, then `Node.removeChild` will not be called. This is useful for implementing animations when removing a Node from the DOM.


## Advanced Usage

Since Simulacra.js is intended to be deterministic, the bound object can be cloned at any point in time and bound again to reset to that state. For example, using the `clone` module:

```js
var clone = require('clone')
var $ = require('simulacra')

var data = { ... }, bindings = $( ... )

var node = $(data, bindings)
var initialData = clone(data)

// Do some mutations, and then reset to initial state.
node = $(initialData, bindings)
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

On initialization, Simulacra.js removes bound elements from the document and replaces them with an empty text node (marker) for memoizing its position. Based on a value in the bound data object, it clones template elements and applies the mutator function on the cloned elements, and appends them near the marker or adjacent nodes.

When a bound key is assigned, it gets internally casted into an array if it is not an array already, and the values of the array are compared with previous values. Based on whether a value at an index has changed, Simulacra.js will remove, insert, or mutate a DOM Node corresponding to the value. This is faster and simpler than diffing changes between DOM trees.


## Caveats

- The `delete` keyword will not trigger a DOM update. Although ES6 `Proxy` has a trap for this keyword, its browser support is lacking and it can not be polyfilled. Also, it would break the API of Simulacra.js for this one feature, so the recommended practice is to set the value to `null` rather than trying to `delete` the key.
- Out-of-bounds array index assignment will not work, because the number of setters is equal to the length of the array.
- The bound data object may not contain any conflicting getters & setters, since they will be overridden by Simulacra.js.


## The Case Against Immutability

An astute reader may notice that Simulacra.js deals only with mutable objects. Including a library for persistent data structures was considered, but is impractical for many reasons. First, any such library would be larger than Simulacra.js itself, and second, it would be detrimental to performance. For any changes, the differences would have to be calculated per data structure. While it may be useful to save a persistent snapshot of a bound object, it is an expensive operation and shouldn't be the default behavior. Another perspective is that Simulacra.js works with plain old JavaScript, and objects are plain old mutable objects as expected.


## Under the Hood

This library is written in ES5 syntactically, and makes use of:

- Object.defineProperty (ES5)
- WeakMap (ES6)
- TreeWalker (DOM Level 2)
- Node.isEqualNode (DOM Level 3)
- Node.contains (DOM Living Standard)

No shims are included. At the bare minimum, it works in IE9+ with a WeakMap polyfill, but otherwise it should work in IE11+.


## Server-Side Rendering

Simulacra.js works in Node.js (it's isomorphic!), with one thing to keep in mind: it should be called within the context of the `window` global, however this may be optional in some implementations. This is most easily done by using `Function.prototype.bind`, although `Function.prototype.call` is more performant. In the following example, [Domino](https://github.com/fgnass/domino) is used as the DOM implementation.

```js
const domino = require('domino')
const simulacra = require('simulacra')

const window = domino.createWindow('<h1></h1>')
const $ = simulacra.bind(window)
const data = { message: 'Hello world!' }
const binding = $('body', {
  message: $('h1')
})

console.log($(data, binding).innerHTML)
```

This will print the string `<h1>Hello world!</h1>` to `stdout`.


## License

This software is licensed under the [MIT license](https://raw.githubusercontent.com/0x8890/simulacra/master/LICENSE).
