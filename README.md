# [Simulacra.js](http://simulacra.js.org/)

[![Build Status](https://img.shields.io/travis/0x8890/simulacra/master.svg?style=flat-square)](https://travis-ci.org/0x8890/simulacra)
[![npm Version](https://img.shields.io/npm/v/simulacra.svg?style=flat-square)](https://www.npmjs.com/package/simulacra)
[![License](https://img.shields.io/npm/l/simulacra.svg?style=flat-square)](https://raw.githubusercontent.com/0x8890/simulacra/master/LICENSE)

Simulacra.js provides one-way data binding from plain JavaScript objects to the DOM. Its size is roughly ~170 LOC, or 1.8 KB (min+gz). Get it from `npm`:

```sh
$ npm install simulacra --save
```


## Usage

Simulacra.js uses plain old HTML with nothing that is coupled with implementation for templating. Here's a sample template, note that it's just a `<template>` tag without any data-binding attributes:

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

Simulacra.js exports only a single function, which does different things based on the types of the arguments. There are three use cases: defining mount & unmount functions for an element, defining nested bindings for an element, and defining a binding for a data object.

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

The DOM will update if any of the bound keys are assigned.

All mount functions are "offline" operations, they mutate elements which exist only in memory. By default, the value will be assigned to the element's `textContent` property (or `value` or `checked` for inputs), additional functions for mounting and unmounting may be used for arbitrary element manipulation.

The mount & unmount functions are passed in as the second and third arguments respectively, and have the signature (`node`, `value`, `oldValue`, `index`). For example, to manipulate a node before mounting it, one may do this:

```js
bind($('.name'), function (node, value) {
  node.textContent = 'Hi ' + value + '!'
})
```

The mount function gets run before a node is replaced, and the unmount function gets run before a node is removed. If there is no return value, then it's assumed that the specified node will be appended. It's possible to return a different node in the mount function, which enables heterogeneous collections.


## Benchmarks

Simulacra.js is even faster than consecutively setting the `innerHTML` property. Based on the [benchmarks](https://lhorie.github.io/mithril/benchmarks.html) from Mithril.js, here's how it compares. Tests ran on a mid-2014 Macbook Pro using Chrome 46. All times are rounded to the nearest millisecond.

| Name              | Loading  | Scripting  | Rendering  | Painting  | Other  |
|:------------------|:---------|:-----------|:-----------|:----------|:-------|
| Simulacra.js      | 1 ms     | 9 ms       | 7 ms       | 27 ms     | 12 ms  |
| *innerHTML*       | 35 ms    | 32 ms      | 5 ms       | 24 ms     | 10 ms  |
| Mithril.js        | 7 ms     | 69 ms      | 17 ms      | 25 ms     | 19 ms  |
| jQuery            | 11 ms    | 101 ms     | 17 ms      | 25 ms     | 23 ms  |
| React.js          | 8 ms     | 109 ms     | 15 ms      | 26 ms     | 22 ms  |
| Angular.js        | 8 ms     | 115 ms     | 15 ms      | 28 ms     | 26 ms  |

To run the benchmarks, you will have to clone the repository and build it by running `npm run build`. The benchmarks are located [here](https://github.com/0x8890/simulacra/tree/master/benchmark).


## How it Works

On initialization, Simulacra.js removes bound elements from the document and replaces them with a empty text node (marker) for memoizing its position. Based on a value in the bound data object, it clones template elements and applies the mount function on the cloned elements, and appends them near the marker or adjacent nodes.

When a bound key is assigned, it gets internally casted into an array if it is not an array already, and the values of the array are compared with previous values. Based on whether a value at an index has changed, Simulacra.js will unmount and mount a DOM Node corresponding to the value. This is faster and simpler than diffing changes between DOM trees, and performing DOM operations on "offline" nodes (not in the live tree) is faster than modifying live nodes.


## Caveats

The DOM will update if there is an assignment on the object, since it uses a property setter under the hood. This means that using the `delete` keyword will not trigger a DOM update. Also, arrays need to be assigned after a mutation, even if it is mutated in place. This is a conscious decision based on performance; replacing the prototype of an object causes [performance problems in every JavaScript engine](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/setPrototypeOf).

The bound data object may not contain any getters & setters of its own, since they will be overridden by Simulacra.js.


## Under the Hood

This library is written in ES5 syntactically, and makes use of:

- Object property getters & setters (ES5)
- WeakMap (ES6)
- TreeWalker (DOM Level 2)
- Node.isEqualNode (DOM Level 3)
- Node.contains (DOM Living Standard)

No shims are included. At the bare minimum, it works in IE9+ with a WeakMap polyfill.


## License

This software is licensed under the [MIT license](https://raw.githubusercontent.com/0x8890/simulacra/master/LICENSE).
