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
