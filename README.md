# [Simulacra.js](http://simulacra.js.org/)
[![Build Status](https://img.shields.io/travis/daliwali/simulacra/master.svg?style=flat-square)](https://travis-ci.org/daliwali/simulacra)
[![npm Version](https://img.shields.io/npm/v/simulacra.svg?style=flat-square)](https://www.npmjs.com/package/simulacra)
[![License](https://img.shields.io/npm/l/simulacra.svg?style=flat-square)](https://raw.githubusercontent.com/daliwali/simulacra/master/LICENSE)

Simulacra.js returns a DOM Node that updates in reaction to mutations in a JavaScript object. Get it from `npm`:

```sh
$ npm i simulacra --save
```


## Synopsis

Simulacra.js returns a DOM Node that updates when an object changes. Its API is a single function, and it does not introduce any new syntax or a template language. It recursively adds metaprogramming features to vanilla data structures to work.

It is a fairly [low cost](#benchmarks) abstraction, though it may not be quite as fast as hand-optimized code. The approximate size of this library is ~5 KB (minified and gzipped).


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

Using the `<template>` tag is optional, any DOM element will suffice. The shape of the state is important since it has a straightforward mapping to the DOM, and arrays are iterated over to output multiple DOM elements. Here's some sample state:

```js
var state = {
  name: 'Pumpkin Spice Latte',
  details: {
    size: [ 'Tall', 'Grande', 'Venti' ],
    vendor: 'Coffee Co.'
  }
}
```

Simulacra.js exports only a single function, which binds an object to the DOM. The first argument must be a singular object, and the second argument is a data structure that defines the bindings. The definition must be a CSS selector string, *change* function or definition object (parent binding only), or an array with at most three elements:

- **Index 0**: a CSS selector string.
- **Index 1**: either a definition object, or a *change* function.
- **Index 2**: if index 1 is a definition object, this may be a *change* function.

```js
var bindObject = require('simulacra') // or `window.simulacra`
var template = document.getElementById('product')

var node = bindObject(state, [ template, {
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
- **`path`**: an object containing info on where the change occurred.

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

- If the bound element is an `input` or a `textarea`, the default behavior will be to update the state when the input changes. This may be overridden with a custom change function.
- If the bound element is the same as its parent, its value will not be iterated over if it is an array.
- If the *change* function returns `simulacra.retainElement` for a remove operation, then `Node.removeChild` will not be called. This is useful for implementing animations when removing an element from the DOM.
- If the change function is applied on a definition object, it will never be a mutate operation, it will first remove and then insert in case of setting a new object over an existing object.


## Helper Functions

Simulacra.js includes some built-in helper functions for common use cases, such as event listening and animations. They are optionalto use, and are opt-in functionality. To use them, one can define a *change* function like so:

```js
var bindObject = require('simulacra')

// This is a Symbol used to signal that an element should be retained
// in the DOM after its value is unset.
var retainElement = bindObject.retainElement

// Helpers are convenience functions for common features, optional to use.
var helpers = require('simulacra/helpers')
var animate = helpers.animate
var bindEvents = helpers.bindEvents

// Accepts a hash keyed by event names, using this has the advantage of
// automatically removing event listeners, even if the element is still
// in the DOM. The optional second argument is `useCapture`.
var bindFn = bindEvents({
  // The first argument is the DOM event, second is the path.
  click: function (event, path) {
    event.target.classList.toggle('alternate')
  }
})

// Accepts class names on insert, mutate, and remove, and a time in ms for
// how long to retain an element after removal.
var animateFn = animate('fade-in', 'bounce', 'fade-out', 1500)

function change (node, value) {
  animateFn.apply(null, arguments)
  bindFn.apply(null, arguments)
  return value || retainElement
}
```


## Server-Side Rendering

Simulacra.js includes an optimized string rendering function. It implements a subset of Simulacra.js and the DOM, but it should work for most common use cases.

```js
const render = require('simulacra/render')

const state = { message: 'Hello world!' }
const binding = { message: 'h1' }
const template = '<h1></h1>'

// The first call to `render` will process the template.
render(state, binding, template)

// Subsequent calls do not need the template anymore.
console.log(render(state, binding))
```

This will print the string `<h1>Hello world!</h1>` to `stdout`.

The DOM API in Node.js can also work, it should be called within the context of the `window` global, however this may be optional in some implementations. In the following example, [Domino](https://github.com/fgnass/domino) is used as the DOM implementation.

```js
const domino = require('domino')
const bindObject = require('simulacra')

const window = domino.createWindow('<h1></h1>')
const $ = bindObject.bind(window)
const state = { message: 'Hello world!' }
const binding = [ 'body', { message: 'h1' } ]

console.log($(state, binding).innerHTML)
```

This will also print the string `<h1>Hello world!</h1>` to `stdout`.


## Rehydrating from Server Rendered Page

Simulacra.js also allows server-rendered DOM to be re-used or *rehydrated*. The main function accepts an optional third argument for this purpose:

```js
const bindObject = require('simulacra')

const state = { /* the state must be populated beforehand */ }
const binding = [ ... ]

// Rehydrate from existing DOM Node.
const node = document.querySelector(...)

bindObject(state, binding, node)
```

Instead of returning a new Node, it will return the Node that was passed in, so it's not necessary to manually append the return value to the DOM. All *change* functions will be run so that event binding can happen, but return values will be ignored. If the Node could not be rehydrated properly, it will throw an error.


## Benchmarks

There are a few benchmarks implemented with Simulacra.js:

- [JS Framework benchmark](https://rawgit.com/krausest/js-framework-benchmark/master/webdriver-ts/table.html): testing most common DOM operations.
- [DBMonster benchmark](http://simulacra.js.org/dbmonster/): mainly re-render performance.
- [Browser render benchmark](https://github.com/daliwali/simulacra/blob/master/benchmark/simulacra.html) ([control](https://github.com/daliwali/simulacra/blob/master/benchmark/native.html)): this is a custom benchmark adapted from Mithril.js, used for comparing Simulacra.js against the native DOM API.
- [Node.js render benchmark](https://github.com/daliwali/simulacra/blob/master/benchmark/render.js): this is a custom benchmark used for comparing Simulacra.js against raw string building.


## Philosophy

The namesake of this library comes from Jean Baudrillard's *[Simulacra and Simulation](https://en.wikipedia.org/wiki/Simulacra_and_Simulation)*. The mental model it provides is that the user interface is a first order simulacrum, or a faithful representation of state.

Its design is motivated by this quote:

>"It is better to have 100 functions operate on one data structure than 10 functions on 10 data structures." —Alan Perlis

Simulacra.js does data binding differently:

- Rather than having much of a public API, it tries to be as opaque as possible. Every built-in way to mutate state is overridden, and becomes an integral part of how it works.
- There is no templating syntax at all. Instead, the binding structure determines how to render an element. This also means that the state has a one-to-one mapping to the DOM.
- All changes are atomic and run synchronously, there is no internal usage of timers or event loops and no need to wait for changes to occur.
- It does not force any component architecture, use a single bound object or as many as desired.

What Simulacra.js does is capture the intent of state changes, so it is important to use the correct semantics. Using `state.details = { ... }` is different from `Object.assign(state.details, { ... })`, the former will assume that the entire object changed and remove and append a new element, while the latter will re-use the same element and check the differences in the key values. For arrays, it is almost always more efficient to use the proper array mutator methods (`push`, `splice`, `pop`, etc). This is also important for implementing animations, since it determines whether elements are created, updated, or removed.

Nodes are updated *if and only if* their values change, that is each value has a 1:1 correspondence to the DOM. Generally, elements should be rendered based on their value alone, external inputs should be avoided.


## How it Works

On initialization, Simulacra.js replaces bound elements from the template with empty text nodes (markers) for memoizing their positions. Based on a value in the bound state object, it clones template elements and applies the *change* function on the cloned elements, and appends them near the marker or adjacent nodes.

When a bound key is assigned, it gets internally casted into an array if it is not an array already, and the values of the array are compared with previous values. Based on whether a value at an index has changed, Simulacra.js will remove, insert, or mutate a DOM element corresponding to the value. Array mutator methods are overridden with optimized implementations, which are faster and simpler than diffing changes between DOM trees.


## Caveats

- The `delete` keyword will not trigger a DOM update. Although ES6 `Proxy` has a trap for this keyword, its browser support is lacking and it can not be polyfilled. Also, it would break the API of Simulacra.js for this one feature, so the recommended practice is to set the value to `null` rather than trying to `delete` the key.
- Out-of-bounds array index assignment will not work, because the number of setters is equal to the length of the array. Similarly, setting the length of an array will not work because a setter can't be defined on the `length` property.


## Under the Hood

This library requires these JavaScript features:

- **Object.defineProperty** (ES5): used for binding keys on objects.

It also makes use of these DOM API features:

- **Node.contains** (DOM Living Standard): used for checking if bound nodes are valid.
- **Node.nextElementSibling** (DOM Living Standard): used for checking if a node is the last child or not.
- **Node.nextSibling** (DOM Level 1): used for performance optimizations.
- **Node.appendChild** (DOM Level 1): used for appending nodes.
- **Node.insertBefore** (DOM Level 1): used for inserting nodes.
- **Node.removeChild** (DOM Level 1): used for removing nodes.
- **Node.cloneNode** (DOM Level 2): used for creating nodes.
- **Node.normalize** (DOM Level 2): cleaning up DOM nodes.
- **Node.isEqualNode** (DOM Level 3): used for equality checking after cloning nodes.
- **TreeWalker** (DOM Level 2): fast iteration through DOM nodes.
- **MutationObserver** (DOM Level 4): used for the `animate` helper.

No shims are included. The bare minimum should be IE9, which has object property support.


## Similar Projects

- [Vue.js](https://vuejs.org/) uses meta-programming to [a limited extent](https://vuejs.org/v2/guide/reactivity.html). In contrast to Simulacra.js, it uses a templating language and comes with its own notion of *components*.
- [Binding.scala](https://github.com/ThoughtWorksInc/Binding.scala) also binds objects to the DOM, but uses a templating language and is written in Scala.
- [Bind.js](https://github.com/remy/bind.js/) has a similar API, but only works on simple key-value pairs and is unoptimized for arrays.
- [Plates](https://github.com/flatiron/plates/) has a similar concept, but uses string templating instead of the DOM API.

## License

This software is licensed under the [MIT license](https://raw.githubusercontent.com/daliwali/simulacra/master/LICENSE).
