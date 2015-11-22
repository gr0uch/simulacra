# Simulacra.js

[![Build Status](https://img.shields.io/travis/0x8890/simulacra/master.svg?style=flat-square)](https://travis-ci.org/0x8890/simulacra)
[![npm Version](https://img.shields.io/npm/v/simulacra.svg?style=flat-square)](https://www.npmjs.com/package/simulacra)
[![License](https://img.shields.io/npm/l/simulacra.svg?style=flat-square)](https://raw.githubusercontent.com/0x8890/simulacra/master/LICENSE)

Simulacra.js provides one-way data binding from plain JavaScript objects to the DOM. Its size is roughly ~160 LOC, or 1.8 KB (min+gz). Get it from `npm`:

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

In the above template, there are no iteration mechanisms, because Simulacra.js will automatically clone DOM elements based on the data. Here's some sample data:

```js
var data = {
  name: 'Pumpkin Spice Latte',
  details: {
    size: [ 'Tall', 'Grande', 'Venti' ],
    vendor: 'Starbucks'
  }
}
```

Simulacra.js exports only a single function, which does different things based on the types of the arguments. There are 3 use cases: defining mount/unmount functions for an element, defining nested bindings for an element, and defining a binding for a data object.

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

document.appendChild(bind(data, bindings))
```

The DOM will update *if and only if* any of the bound data keys are assigned. All mount functions are "offline" operations, they mutate elements which exist only in memory. By default, the key value will be assigned to the element's `textContent` property, additional functions for mounting and unmounting may be used for arbitrary element manipulation.

The mount & unmount functions are passed in as the 2nd and 3rd arguments respectively, and have the signature (`node`, `value`, `oldValue`). For example, to manipulate a node before mounting it, one may do this:

```js
bind($('.name'), function (node, value) {
  node.textContent = 'Hi ' + value + '!'
})
```

The mount function gets run before a node is replaced, and the unmount function gets run before a node is removed.


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


## How it Works

On initialization, Simulacra.js removes bound elements from the document and replaces them with a empty text node (marker) for memoizing its position. Based on a key value, it clones template elements and applies the DOM operations on the cloned elements, and appends them next to the marker.


## Caveats

The DOM will update *if and only if* there is an assignment on the object, since it uses a property setter under the hood. This means that using the `delete` keyword will not trigger a DOM update. Also, arrays need to be assigned after a mutation, even if it is mutated in place.


## Under the Hood

This library is written in ES5 syntactically, and makes use of:

- Object property getters & setters (ES5)
- WeakMap (ES6)
- DocumentFragment (DOM Level 1)
- TreeWalker (DOM Level 2)
- Node.isEqualNode (DOM Level 3)
- Node.contains (DOM Living Standard)

No polyfills are included.


## License

This software is licensed under the [MIT license](https://raw.githubusercontent.com/0x8890/simulacra/master/LICENSE).
