# [Simulacra.js](http://simulacra.js.org/)

[![Build Status](https://img.shields.io/travis/0x8890/simulacra/master.svg?style=flat-square)](https://travis-ci.org/0x8890/simulacra)
[![npm Version](https://img.shields.io/npm/v/simulacra.svg?style=flat-square)](https://www.npmjs.com/package/simulacra)
[![License](https://img.shields.io/npm/l/simulacra.svg?style=flat-square)](https://raw.githubusercontent.com/0x8890/simulacra/master/LICENSE)

Simulacra.js provides one-way data binding from plain JavaScript objects to the DOM. Its size is roughly ~300 LOC, or 2 KB (min+gz). Get it from `npm`:

```sh
$ npm i simulacra --save
```


## Abstract

Simulacra.js provides one-way binding between JavaScript objects and the DOM. When data changes, it maps those changes to the DOM by adding and removing elements, and changing plain text and form input values. Everything else is delegated to the DOM API.


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

The mutator function may be passed as the second argument to Simulacra.js, it accepts one argument, the context object, which may contain the keys `object`, `key`, `node`, `value`, `previousValue`, & `index`. For example, to manipulate a node in a custom way, one may do this:

```js
bind($('.name'), function (context) {
  context.node.textContent = 'Hi ' + context.value + '!'
})
```

A mutator function can be determined to be an insert, mutate, or remove operation based on whether the value or previous value is `null`:

- Value but not previous value: insert operation.
- Value and previous value: mutate operation.
- No value: remove operation.

There is a special case for the mutator function: if the bound node is the same as its parent, its value will not be iterated over, and no index will be passed.


## Benchmarks

Simulacra.js is only marginally slower than `appendChild` in terms of DOM rendering. Based on the [benchmarks](https://lhorie.github.io/mithril/benchmarks.html) from Mithril.js, here's how it compares. Tests ran on a Linux desktop using Chrome 48. All times are rounded to the nearest millisecond.

| Name              | Loading  | Scripting  | Rendering  | Painting  | Other  |
|:------------------|:---------|:-----------|:-----------|:----------|:-------|
| *appendChild*     | 13 ms    | 5 ms       | 14 ms      | 2 ms      | 4 ms   |
| Simulacra.js      | 12 ms    | 11 ms      | 13 ms      | 2 ms      | 4 ms   |
| Mithril.js        | 9 ms     | 65 ms      | 20 ms      | 2 ms      | 3 ms   |
| jQuery            | 11 ms    | 92 ms      | 14 ms      | 1 ms      | 3 ms   |
| Backbone          | 16 ms    | 55 ms      | 12 ms      | 1 ms      | 4 ms   |
| React.js          | 12 ms    | 79 ms      | 12 ms      | 1 ms      | 6 ms   |
| Angular.js        | 19 ms    | 120 ms     | 13 ms      | 1 ms      | 5 ms   |

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
const bind = simulacra.bind(window)
const data = { message: 'Hello world!' }
const binding = bind(window.document.body, {
  message: bind(window.document.querySelector('h1'))
})

process.stdout.write(bind(data, binding).innerHTML)
```

This will print the string `<h1>Hello world!</h1>` to `stdout`.


## License

This software is licensed under the [MIT license](https://raw.githubusercontent.com/0x8890/simulacra/master/LICENSE).
