# [Simulacra.js](http://simulacra.js.org/)

[![Build Status](https://img.shields.io/travis/0x8890/simulacra/master.svg?style=flat-square)](https://travis-ci.org/0x8890/simulacra)
[![npm Version](https://img.shields.io/npm/v/simulacra.svg?style=flat-square)](https://www.npmjs.com/package/simulacra)
[![License](https://img.shields.io/npm/l/simulacra.svg?style=flat-square)](https://raw.githubusercontent.com/0x8890/simulacra/master/LICENSE)

Simulacra.js provides one-way data binding from plain JavaScript objects to the DOM. Its size is roughly ~300 LOC, or ~2 KB (min+gz). Get it from `npm`:

```sh
$ npm i simulacra --save
```


## Abstract

Simulacra.js makes the DOM react to changes in data. When data changes, it maps those changes to the DOM by adding and removing elements after invoking mutator functions, which by default, assign plain text and form input values. Deterministic rendering is achieved by only mutating data, and resorting to DOM manipulation on local nodes only.


## Usage

Simulacra.js uses plain old HTML for templating. Here's a sample template:

```html
<template id="product">
  <h1 class="name"></h1>
  <div class="details">
    <div><span class="size"></span></div>
    <h4 class="vendor"></h4>
  </div>
</template>
```

Using the `<template>` tag is optional but optimal since its contents are not rendered by default, but any DOM element will suffice. In the above template, there are no iteration mechanisms, because Simulacra.js will automatically clone DOM elements based on the data. Here's some sample data:

```js
var data = {
  name: 'Pumpkin Spice Latte',
  details: {
    size: [ 'Tall', 'Grande', 'Venti' ],
    vendor: 'Starbucks'
  }
}
```

Simulacra.js exports only a single function, which can simultaneously define bindings to the DOM, and apply bindings to an object. If the first argument is an object, it will try to bind the second argument onto the object. If the first argument is either a DOM Node or a string, it will return a definition object that is used by Simulacra.js internally, and the second argument then defines either a nested definition or a mutator function. Putting it all together:

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

The DOM will update if any of the bound keys are assigned a different value, or if any `Array.prototype` methods on the value are invoked.

By default, the value will be assigned to the element's `textContent` property (or `value` or `checked` for inputs), a user-defined mutator function may be used for arbitrary element manipulation. If a mutator function for an input is not specified, it automatically receives an event listener which will update its own data when input is changed.

The mutator function may be passed as the second argument to Simulacra.js, it has the signature (`node`, `value`, `previousValue`, `index`):

- `node`: the local DOM node.
- `value`: the value assigned to the key of the bound object.
- `previousValue`: the previous value assigned to the key of the bound object.
- `index`: the array index of the value, which may be omitted if the assigned value is not an array or if the bound node is equal to its parent.

In general, it is not a good idea to mutate other DOM nodes within the mutator function other than the local node, since it may make rendering non-deterministic. To manipulate a node in a custom way, one may define a mutator function like so:

```js
$(node || selector, function mutator (node, value) {
  node.textContent = 'Hi ' + value + '!'
})
```

A mutator function can be determined to be an insert, mutate, or remove operation based on whether the value or previous value is `null`:

- Value but not previous value: insert operation.
- Value and previous value: mutate operation.
- No value: remove operation.

There is a special case for the mutator function: if the bound node is the same as its parent, its value will not be iterated over, and no index will be passed.


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
const binding = $(window.document.body, {
  message: $(window.document.querySelector('h1'))
})

process.stdout.write($(data, binding).innerHTML)
```

This will print the string `<h1>Hello world!</h1>` to `stdout`.


## License

This software is licensed under the [MIT license](https://raw.githubusercontent.com/0x8890/simulacra/master/LICENSE).
