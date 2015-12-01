'use strict'

var processNodes = require('./process_nodes')
var defineProperties = require('./define_properties')

module.exports = simulacra


/**
 * Dynamic dispatch function.
 *
 * @param {Node|Object}
 * @param {Function|Object}
 */
function simulacra (a, b) {
  if (a instanceof Node) return define(a, b)
  if (typeof a === 'object') return bind(a, b)

  throw new TypeError('First argument must be either ' +
    'a DOM Node or an Object.')
}


/**
 * Define a binding.
 *
 * @param {String|Node}
 * @param {Function|Object}
 */
function define (node, def) {
  // Memoize the selected node.
  var obj = { node: node }

  // Although WeakSet would work here, WeakMap has better browser support.
  var seen = new WeakMap()

  var i, j, keys, branch, boundNode

  if (typeof def === 'function')
    obj.mutator = def

  else if (typeof def === 'object') {
    obj.definition = def

    for (i = 0, keys = Object.keys(def), j = keys.length; i < j; i++) {
      branch = def[keys[i]]
      boundNode = branch.node

      // Special case for binding to parent node.
      if (node === boundNode) {
        branch.__isBoundToParent = true
        if (branch.mutator && branch.mutator.__isDefault)
          branch.mutator = noop(keys[i])
        continue
      }

      if (!node.contains(boundNode))
        throw new Error('The bound DOM Node must be either ' +
          'contained in or equal to its parent binding.')

      if (!seen.get(boundNode)) seen.set(boundNode, true)
      else throw new Error('Can not bind multiple keys to the same child ' +
        'DOM Node. Collision found on key "' + keys[i] + '".')
    }
  }

  else if (def === void 0)
    if (node.nodeName === 'INPUT' || node.nodeName === 'SELECT')
      if (node.type === 'checkbox' || node.type === 'radio')
        obj.mutator = replaceChecked
      else obj.mutator = replaceValue
    else obj.mutator = replaceText

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
  defineProperties(obj, def.definition, node)

  return node
}


// Default DOM mutation functions.
function replaceText (node, value) { node.textContent = value }
function replaceValue (node, value) { node.value = value }
function replaceChecked (node, value) { node.checked = value }

replaceText.__isDefault = true
replaceValue.__isDefault = true
replaceChecked.__isDefault = true

function noop (key) {
  return function () {
    console.warn( // eslint-disable-line
      'Undefined mutator function for key "' + key + '".')
  }
}
