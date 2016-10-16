# [Simulacra.js](http://simulacra.js.org/)
[![Build Status](https://img.shields.io/travis/0x8890/simulacra/master.svg?style=flat-square)](https://travis-ci.org/0x8890/simulacra)
[![npm Version](https://img.shields.io/npm/v/simulacra.svg?style=flat-square)](https://www.npmjs.com/package/simulacra)
[![License](https://img.shields.io/npm/l/simulacra.svg?style=flat-square)](https://raw.githubusercontent.com/0x8890/simulacra/master/LICENSE)

Simulacra.js binds JavaScript objects to the DOM. Get it from `npm`:

```sh
$ npm i simulacra --save
```


## Synopsis

Simulacra.js maps changes on objects to the DOM by adding and removing elements and invoking *change* functions, which by default, assign plain text and form input values. In fact, that is all it does, and its entire API surface area is a single function. It also does not introduce any new syntax or a template language, and is designed to work well with current and future web platform features, such as [Web Components](http://webcomponents.org/).

It emphasizes [performance](#benchmarks) and economy of expression. The approximate size of this library is ~5 KB (minified and gzipped).


## Usage

Simulacra.js uses plain HTML for templating, and it does not introduce its own template language. This makes it straightforward to start with a static HTML page and add interactive parts. Here's a sample template:

```html
<template id="product">
  <h1 class="name"></h1>
  <div class="details">
    <div><span class="size"></span></div>
    <h4 class="vendor"></h4>
  </div>
</template>
```

Using the `<template>` tag is optional, any DOM element will suffice. The shape of the data is important since it has a straightforward mapping to the DOM, and arrays are iterated over to output multiple DOM elements. Here's some sample data:

```js
var data = {
  name: 'Pumpkin Spice Latte',
  details: {
    size: [ 'Tall', 'Grande', 'Venti' ],
    vendor: 'Starbucks'
  }
}
```

Simulacra.js exports only a single function, which binds an object to the DOM. The first argument must be a singular object, and the second argument is a data structure that defines the bindings. The definition must be a CSS selector string, DOM Node, *change* function or definition object (parent binding only), or an array with at most three elements:

- **Index 0**: either a DOM element or a CSS selector string.
- **Index 1**: either a definition object, or a *change* function.
- **Index 2**: if index 1 is a definition object, this may be a *change* function.

```js
var bindObject = require('simulacra') // or `window.simulacra`
var template = document.getElementById('product')

var node = bindObject(data, [ template, {
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

By default, the value will be assigned to the element's `textContent` property (or `value` or `checked` for inputs). A user-defined *change* function may be passed for arbitrary element manipulation, and its return value determines the new `textContent`, `value`, or `checked` attribute if it is not applied on a definition object. The *change* function may be passed as the second or third position, it has the signature (`element`, `value`, `previousValue`, `path`):

- **`element`**: the local DOM element.
- **`value`**: the value assigned to the key of the bound object.
- **`previousValue`**: the previous value assigned to the key of the bound object.
- **`path`**: an array containing the full path to the value. For example: `[ 'users', 2, 'email' ]`. Integer values indicate array indices. The root object is accessible at the `root` property of the path array, i.e. `path.root`, and the deepest bound object is accessible at the `target` property, i.e. `path.target`.

To manipulate an element in a custom way, one may define a *change* function like so:

```js
[ selector, function (element, value, previousValue) {
  // Attach listeners before inserting a DOM Node.
  if (previousValue === null)
    element.addEventListener('click', function () {
      alert('clicked')
    })

  return 'Hi ' + value + '!'
} ]
```

A *change* function can be determined to be an insert, mutate, or remove operation based on whether the value or previous value is `null`:

- **Value but not previous value**: insert operation.
- **Value and previous value**: mutate operation.
- **No value**: remove operation.

There are some special cases for the *change* function:

- If the bound element is an `input` or a `textarea`, the default behavior will be to update the data when the input changes. This may be overridden with a custom change function.
- If the bound element is the same as its parent, its value will not be iterated over if it is an array.
- If the *change* function returns `simulacra.retainElement` for a remove operation, then `Node.removeChild` will not be called. This is useful for implementing animations when removing an element from the DOM.
- If the change function is applied on a definition object, it will never be a mutate operation, it will first remove and then insert in case of setting a new object over an existing object.


## Helper Functions

Simulacra.js includes some built-in helper functions for common use cases, such as event listening and animations. They are completely optional and not part of the core functionality, but included for convenience. To use them, one can define a *change* function like so:

```js
var bindObject = require('simulacra')
var flow = bindObject.flow
var setDefault = bindObject.setDefault
var bindEvents = bindObject.bindEvents
var animate = bindObject.animate

var change = flow(
  // Use default behavior for mapping values to the DOM.
  setDefault,

  // Accepts a hash keyed by event names, using this has the advantage of
  // automatically removing event listeners, even if the element is still
  // in the DOM. The optional second argument is `useCapture`.
  bindEvents({
    // The first argument is the DOM event, second is the path to the data.
    click: function (event, path) {
      event.target.classList.toggle('alternate')
    }
  }),

  // Accepts class names on insert, mutate, and remove, and a time in ms for
  // how long to retain an element after removal.
  animate('fade-in', 'bounce', 'fade-out', 1500))
```

Note that `setDefault` should generally be set first if the default behavior is desired.


## Data Binding

Once the bindings have been set up, one does not need to call Simulacra.js again. For example, assigning `data.name = 'Simulacra'`  by default will set the text of the element to that value and append it to the DOM if it doesn't exist, and `data.name = null` will remove all elements corresponding to that field. Assigning `data.name = ['John', 'Doe']` will create missing elements and assign the text of both elements, and append them if necessary.

The bindings work recursively on objects, which provides a simple way to build complex user interfaces. For example, assigning `data.details = { size: [1, 2, 3], vendor: 'X' }` will create the element for `details` and the child elements corresponding to its fields (`size`, `vendor`, etc), and remove the previous element if it existed. The new object also has bindings, so `data.details.size.push(4)` will create a new element corresponding to that value.

All values that are bound to non-parent elements are arrays internally, which will be mapped to elements. For example, a list of things may be modelled as an array of objects: `[ {...}, {...}, {...} ]`. The arrays which are bound also have instance-specific methods for efficient DOM manipulation, i.e. `array.splice(2, 0, { ... })` will insert a new element at index `2` without touching the other elements.

What Simulacra.js does is capture the intent of the state change, so it is important to use the correct semantics. Using `data.details = { ... }` is different from `Object.assign(data.details, { ... })`, the former will assume that the entire object changed and remove and append a new element, while the latter will re-use the same element and check the differences in the key values. For arrays, it is almost always more efficient to use the proper array mutator methods (`push`, `splice`, `pop`, etc). This is also important for implementing animations, since it determines whether elements are created, updated, or removed.


## Benchmarks

Simulacra.js is pretty fast in the [DBMonster benchmark](http://simulacra.js.org/dbmonster/). In initial rendering speed based on the [benchmarks](https://lhorie.github.io/mithril/benchmarks.html) from Mithril.js, here's how it compares. Tests ran on a Linux desktop using Chromium.

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

On initialization, Simulacra.js replaces bound elements from the template with empty text nodes (markers) for memoizing their positions. Based on a value in the bound data object, it clones template elements and applies the *change* function on the cloned elements, and appends them near the marker or adjacent nodes.

When a bound key is assigned, it gets internally casted into an array if it is not an array already, and the values of the array are compared with previous values. Based on whether a value at an index has changed, Simulacra.js will remove, insert, or mutate a DOM element corresponding to the value. This is faster and simpler than diffing changes between DOM trees.


## Caveats

- The `delete` keyword will not trigger a DOM update. Although ES6 `Proxy` has a trap for this keyword, its browser support is lacking and it can not be polyfilled. Also, it would break the API of Simulacra.js for this one feature, so the recommended practice is to set the value to `null` rather than trying to `delete` the key.
- Out-of-bounds array index assignment will not work, because the number of setters is equal to the length of the array. Similarly, setting the length of an array will not work because a setter can't be defined on the `length` property.
- The bound data object may not contain any conflicting getters & setters, since they will be overridden by Simulacra.js.
- Using `bind`, `call`, `apply`, with `Array.prototype` on bound arrays won't work, because the bound arrays implement instance methods.


## Under the Hood

This library makes use of these JavaScript features:

- **Object.defineProperty** (ES5): used for binding keys on objects.
- **Object.freeze** (ES5.1): used to prevent internal state from being mutated.
- **WeakMap** (ES6): memory efficient mapping of DOM nodes.

It also makes use of these DOM API features:

- **Document.createDocumentFragment** (DOM Level 2): used for bulk insertions.
- **Node.appendChild** (DOM Level 1): used for inserting elements in to document fragments.
- **Node.contains** (DOM Living Standard): used for checking if bound elements are valid.
- **Node.insertBefore** (DOM Level 1): used for inserting document fragments.
- **Node.isEqualNode** (DOM Level 3): used for equality checking after cloning nodes.
- **Node.removeChild** (DOM Level 1): used for removing elements.
- **TreeWalker** (DOM Level 2): fast iteration through DOM nodes.
- **MutationObserver** (DOM Level 4): used for the `animate` helper.

No shims are included. At the bare minimum, it works in IE9+ with a WeakMap polyfill, but otherwise it should work in IE11+.


## Server-Side Rendering

Simulacra.js works in Node.js (it's isomorphic!), with one thing to keep in mind: it should be called within the context of the `window` global, however this may be optional in some implementations. This is most easily done by using `Function.prototype.bind`, although `Function.prototype.call` is more performant. In the following example, [Domino](https://github.com/fgnass/domino) is used as the DOM implementation.

```js
const domino = require('domino')
const bindObject = require('simulacra')

const window = domino.createWindow('<h1></h1>')
const $ = bindObject.bind(window)
const data = { message: 'Hello world!' }
const binding = [ 'body', {
  message: 'h1'
} ]

console.log($(data, binding).innerHTML)
```

This will print the string `<h1>Hello world!</h1>` to `stdout`.


## Rehydrating from Server Rendered Page

Simulacra.js also allows server-rendered DOM to be re-used or *rehydrated*. The main function accepts an optional third argument for this purpose:

```js
const bindObject = require('simulacra')

const data = { /* the data must be populated beforehand */ }
const binding = [ ... ]

// Rehydrate from existing DOM Node.
const node = document.querySelector(...)

bindObject(data, binding, node)
```

Instead of returning a new Node, it will return the Node that was passed in, so it's not necessary to manually append the return value to the DOM. All *change* and *mount* functions will be run. If the Node could not be rehydrated properly, it will throw an error.


## License

This software is licensed under the [MIT license](https://raw.githubusercontent.com/0x8890/simulacra/master/LICENSE).
