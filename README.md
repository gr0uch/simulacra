# [Simulacra.js](http://simulacra.js.org/)

[![Build Status](https://img.shields.io/travis/0x8890/simulacra/master.svg?style=flat-square)](https://travis-ci.org/0x8890/simulacra)
[![npm Version](https://img.shields.io/npm/v/simulacra.svg?style=flat-square)](https://www.npmjs.com/package/simulacra)
[![License](https://img.shields.io/npm/l/simulacra.svg?style=flat-square)](https://raw.githubusercontent.com/0x8890/simulacra/master/LICENSE)

Simulacra.js provides one-way data binding from plain JavaScript objects to the DOM. Its size is roughly ~270 LOC, or 2 KB (min+gz). Get it from `npm`:

```sh
$ npm install simulacra --save
```


## Abstract

Simulacra.js aims to minimize the expression necessary to render a web application. In contrast with the public APIs of other software that interacts with the DOM, Simulacra.js exposes only a single function that accepts two arguments. It lacks a template syntax, so data binding works by selecting DOM nodes. All data binding beyond adding and removing elements, and changing plain text and form input values, is delegated to the DOM API.

There is no coupling of templating with code, and no forced design paradigms, such as components. The goal is to demonstrate that ideas such as avoiding direct DOM manipulation and *unidirectional data flow* are not dependent on heavyweight software, and that it can be implemented with much better performance.


## Usage

Simulacra.js uses plain old HTML with nothing that is coupled with implementation for templating. Here's a sample template:

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

Simulacra.js exports only a single function, which does different things based on the types of the arguments. There are three use cases: defining a mutator function for an element, defining nested bindings for an element, and defining a binding for a data object.

```js
var bind = require('simulacra') // or `window.simulacra`

// Simulacra.js accepts DOM Nodes, the `$` function is just an alias for
// `querySelector` which is a convenient way to select them.
function $ (selector) { return fragment.querySelector(selector) }

var fragment = document.getElementById('product').content

var bindings = bind(fragment, {
  name: bind($('.name')),
  details: bind($('.details'), {
    size: bind($('.size')),
    vendor: bind($('.vendor'))
  })
})

document.body.appendChild(bind(data, bindings))
```

The DOM will update if any of the bound keys are assigned a different value.

By default, the value will be assigned to the element's `textContent` property (or `value` or `checked` for inputs), a user-defined mutator function may be used for arbitrary element manipulation.

The mutator function may be passed as the second argument to Simulacra.js, and has the signature (`node`, `value`, `oldValue`, `index`). For example, to manipulate a node in a custom way, one may do this:

```js
bind($('.name'), function (node, value) {
  node.textContent = 'Hi ' + value + '!'
})
```

A mutator function can be determined to be an insert, mutate, or remove operation based on whether the value or previous value is `null`:

- Value but not previous value: insert operation.
- Value and previous value: mutate operation.
- No value: remove operation.

There is a special case for the mutator function: if the bound node is the same as its parent, its value will not be iterated over, and no index will be passed.


## Benchmarks

Simulacra.js is even faster than consecutively setting the `innerHTML` property. Based on the [benchmarks](https://lhorie.github.io/mithril/benchmarks.html) from Mithril.js, here's how it compares. Tests ran on a mid-2014 Macbook Pro using Chrome 46. All times are rounded to the nearest millisecond.

| Name              | Loading  | Scripting  | Rendering  | Painting  | Other  |
|:------------------|:---------|:-----------|:-----------|:----------|:-------|
| Simulacra.js      | 1 ms     | 12 ms      | 6 ms       | 24 ms     | 8 ms   |
| *innerHTML*       | 35 ms    | 32 ms      | 5 ms       | 24 ms     | 10 ms  |
| Mithril.js        | 7 ms     | 69 ms      | 17 ms      | 25 ms     | 19 ms  |
| jQuery            | 11 ms    | 101 ms     | 17 ms      | 25 ms     | 23 ms  |
| React.js          | 8 ms     | 109 ms     | 15 ms      | 26 ms     | 22 ms  |
| Angular.js        | 8 ms     | 115 ms     | 15 ms      | 28 ms     | 26 ms  |

To run the benchmarks, you will have to clone the repository and build it by running `npm run build`. The benchmarks are located [here](https://github.com/0x8890/simulacra/tree/master/benchmark).


## How it Works

On initialization, Simulacra.js removes bound elements from the document and replaces them with an empty text node (marker) for memoizing its position. Based on a value in the bound data object, it clones template elements and applies the mutator function on the cloned elements, and appends them near the marker or adjacent nodes.

When a bound key is assigned, it gets internally casted into an array if it is not an array already, and the values of the array are compared with previous values. Based on whether a value at an index has changed, Simulacra.js will remove, insert, or mutate a DOM Node corresponding to the value. This is faster and simpler than diffing changes between DOM trees.


## Caveats

- The `delete` keyword will not trigger a DOM update. Although ES6 `Proxy` has a trap for this keyword, its browser support is lacking and it can not be polyfilled. Also, it would break the API of Simulacra.js for this one feature, so the recommended practice is to set the value to `null` rather than trying to `delete` the key.
- Out-of-bounds array index assignment will not work, because the number of settters is equal to the length of the array.
- The bound data object may not contain any conflicting getters & setters, since they will be overridden by Simulacra.js.


## Under the Hood

This library is written in ES5 syntactically, and makes use of:

- Object.defineProperty (ES5)
- WeakMap (ES6)
- TreeWalker (DOM Level 2)
- Node.isEqualNode (DOM Level 3)
- Node.contains (DOM Living Standard)

No shims are included. At the bare minimum, it works in IE9+ with a WeakMap polyfill, but otherwise it should work in IE11+.


## License

This software is licensed under the [MIT license](https://raw.githubusercontent.com/0x8890/simulacra/master/LICENSE).
