/*!
 * Simulacra.js
 * Version 0.0.6
 * https://github.com/0x8890/simulacra
 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'

var processNodes = require('./process_nodes')

module.exports = defineSetters

/**
 * Define setters. This function does most of the heavy lifting.
 *
 * @param {Object} obj
 * @param {Object} def
 */
function defineSetters (obj, def) {
  // Using the closure here to store private object.
  var store = {}

  var keys = Object.keys(obj)
  var i, j, key

  for (i = 0, j = keys.length; i < j; i++) {
    key = keys[i]
    store[key] = obj[key]
    define(key)
  }

  function define (key) {
    var branch = def[key]
    var mount = branch.mount
    var unmount = branch.unmount
    var definition = branch.definition

    // Keeping state in this closure.
    var activeNodes = []
    var previousValues = []

    Object.defineProperty(obj, key, {
      get: getter, set: setter, enumerable: true
    })

    // For initialization, call this once.
    setter(store[key])

    function getter () {
      return store[key]
    }

    function setter (x) {
      var values = Array.isArray(x) ? x : [ x ]
      var i, j, isEmpty, value, previousValue,
        node, activeNode, parentNode

      store[key] = x

      // Handle rendering to the DOM.
      j = Math.max(previousValues.length, values.length)

      for (i = 0; i < j; i++) {
        value = values[i]
        activeNode = activeNodes[i]
        previousValue = previousValues[i]
        isEmpty = value === null || value === void 0
        parentNode = branch.marker.parentNode

        if (isEmpty) {
          delete previousValues[i]
          delete activeNodes[i]
          if (unmount) unmount(activeNode, value, previousValue, i)
          if (activeNode) parentNode.removeChild(activeNode)
          continue
        }

        if (previousValue === value) continue

        previousValues[i] = value

        if (unmount) unmount(activeNode, value, previousValue, i)
        if (activeNode) parentNode.removeChild(activeNode)

        if (mount) {
          node = branch.node.cloneNode(true)
          node = mount(node, value, previousValue, i) || node
          activeNodes[i] = parentNode.insertBefore(node, branch.marker)
          continue
        }

        if (definition) {
          node = processNodes(branch.node.cloneNode(true), definition)
          defineSetters(value, definition)
          activeNodes[i] = parentNode.insertBefore(node, branch.marker)
          continue
        }
      }

      // Reset length to current values.
      previousValues.length = activeNodes.length = values.length
    }
  }
}

},{"./process_nodes":4}],2:[function(require,module,exports){
'use strict'

module.exports = findNodes


/**
 * Find matching DOM nodes on cloned nodes.
 *
 * @param {Node} node
 * @param {Object} definition
 * @return {WeakMap}
 */
function findNodes (node, definition) {
  var treeWalker = document.createTreeWalker(
    node, NodeFilter.SHOW_ELEMENT)
  var keys = Object.keys(definition)
  var map = new WeakMap()
  var nodes = []
  var i, j

  for (i = 0, j = keys.length; i < j; i++)
    nodes[nodes.length] = definition[keys[i]].node

  while (treeWalker.nextNode() && j)
    for (i = 0, j = nodes.length; i < j; i++)
      if (treeWalker.currentNode.isEqualNode(nodes[i])) {
        map.set(nodes[i], treeWalker.currentNode)
        nodes.splice(i, 1)
      }

  return map
}

},{}],3:[function(require,module,exports){
'use strict'

var processNodes = require('./process_nodes')
var defineSetters = require('./define_setters')

module.exports = simulacra


/**
 * Dynamic dispatch function.
 *
 * @param {Node|Object}
 * @param {Function|Object}
 * @param {Function}
 */
function simulacra (a, b, c) {
  if (a instanceof Node) return define(a, b, c)
  if (typeof a === 'object') return bind(a, b)

  throw new TypeError('First argument must be either ' +
    'an DOM Node or an Object.')
}


/**
 * Define a binding.
 *
 * @param {String|Node}
 * @param {Function|Object}
 * @param {Function}
 */
function define (node, def, unmount) {
  // Memoize the selected node.
  var obj = { node: node }

  // Although WeakSet would work here, WeakMap has better browser support.
  var seen = new WeakMap()

  var i, j, keys, value

  if (typeof def === 'function') {
    obj.mount = def
    if (typeof unmount === 'function') obj.unmount = unmount
  }

  else if (typeof def === 'object') {
    obj.definition = def

    for (i = 0, keys = Object.keys(def), j = keys.length; i < j; i++) {
      value = def[keys[i]].node
      if (!node.contains(value))
        throw new Error('The bound DOM Node must be ' +
          'contained in its parent.')
      if (!seen.get(value)) seen.set(value, true)
      else throw new Error('Can not bind multiple keys to the same ' +
        'DOM Node. Collision found on "' + keys[i] + '".')
    }
  }

  else if (def === void 0) {
    if (node.nodeName === 'INPUT' || node.nodeName === 'SELECT') {
      if (node.type === 'checkbox' || node.type === 'radio')
        obj.mount = replaceChecked
      else obj.mount = replaceValue
    }
    else obj.mount = replaceText
  }

  else throw new TypeError('Second argument must be either ' +
    'a function or an object.')

  return obj
}


/**
 * Bind an object to a Node.
 *
 * @param {Object}
 * @param {Object}
 * @return {Node}
 */
function bind (obj, def) {
  var node

  if (Array.isArray(obj))
    throw new TypeError('First argument must be a singular object.')

  if (!(def.node instanceof Node))
    throw new TypeError('Top-level binding must have a Node.')

  if (typeof def.definition !== 'object')
    throw new TypeError('Top-level binding must be an object.')

  node = processNodes(def.node.cloneNode(true), def.definition)
  defineSetters(obj, def.definition)

  return node
}


function replaceText (node, value) {
  node.textContent = value
}


function replaceValue (node, value) {
  node.value = value
}


function replaceChecked (node, value) {
  node.checked = value
}

},{"./define_setters":1,"./process_nodes":4}],4:[function(require,module,exports){
'use strict'

var findNodes = require('./find_nodes')
var emptyString = ''

module.exports = processNodes

/**
 * Internal function to remove bound nodes and replace them with markers.
 *
 * @param {Node}
 * @param {Object}
 * @return {Node}
 */
function processNodes (node, def) {
  var keys = Object.keys(def)
  var map = findNodes(node, def)
  var i, j, branch, key, mirrorNode, marker, parent

  for (i = 0, j = keys.length; i < j; i++) {
    key = keys[i]
    branch = def[key]
    mirrorNode = map.get(branch.node)
    parent = mirrorNode.parentNode
    marker = document.createTextNode(emptyString)
    branch.marker = parent.insertBefore(marker, mirrorNode)
    parent.removeChild(mirrorNode)
  }

  return node
}

},{"./find_nodes":2}],5:[function(require,module,exports){
'use strict'

window.simulacra = require('../lib')

},{"../lib":3}]},{},[5]);
