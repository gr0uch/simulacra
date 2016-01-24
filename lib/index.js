'use strict'

var processNodes = require('./process_nodes')
var defineProperties = require('./define_properties')

module.exports = simulacra

simulacra.define = define
simulacra.bind = bind


/**
 * Dynamic dispatch function.
 *
 * @param {Node|Object}
 * @param {Function|Object}
 */
function simulacra (a, b) {
  var Node = this ? this.Node : window.Node

  if (a instanceof Node) return define(a, b)
  if (typeof a === 'object' && a !== null) return bind.call(this, a, b)

  throw new TypeError('First argument must be either ' +
    'a DOM Node or an Object.')
}


/**
 * Define a binding.
 *
 * @param {Node}
 * @param {Function|Object}
 */
function define (node, def) {
  // Memoize the selected node.
  var obj = { node: node }

  // Although WeakSet would work here, WeakMap has better browser support.
  var seen = new WeakMap()

  var key, branch, boundNode

  if (typeof def === 'function')
    obj.mutator = def

  else if (typeof def === 'object') {
    obj.definition = def

    for (key in def) {
      branch = def[key]
      boundNode = branch.node

      // Special case for binding to parent node.
      if (node === boundNode) {
        branch.__isBoundToParent = true
        if (branch.mutator && branch.mutator.__isDefault)
          branch.mutator = noop(key)
        continue
      }

      if (!node.contains(boundNode))
        throw new Error('The bound DOM Node must be either ' +
          'contained in or equal to its parent binding.')

      if (!seen.get(boundNode)) seen.set(boundNode, true)
      else throw new Error('Can not bind multiple keys to the same child ' +
        'DOM Node. Collision found on key "' + key + '".')
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
  var Node = this ? this.Node : window.Node, node

  if (Array.isArray(obj))
    throw new TypeError('First argument must be a singular object.')

  if (!(def.node instanceof Node))
    throw new TypeError('Top-level binding must have a Node.')

  if (typeof def.definition !== 'object')
    throw new TypeError('Top-level binding must be an object.')

  node = processNodes(this, def.node.cloneNode(true), def.definition)
  defineProperties(this, obj, def.definition, node)

  return node
}


// Default DOM mutation functions.

function replaceText (context) {
  context.node.textContent = context.value
}

function replaceValue (context) {
  if (context.previousValue === null)
    context.node.addEventListener('input', function () {
      context.object[context.key] = context.node.value
    })

  if (context.node.value !== context.value)
    context.node.value = context.value
}

function replaceChecked (context) {
  if (context.previousValue === null)
    context.node.addEventListener('input', function () {
      context.object[context.key] = context.node.checked
    })

  if (context.node.checked !== context.value)
    context.node.checked = context.value
}

// Private static property, used for checking parent binding function.
replaceText.__isDefault =
  replaceValue.__isDefault =
  replaceChecked.__isDefault =
  true

function noop (key) {
  return function () {
    console.warn( // eslint-disable-line
      'Undefined mutator function for key "' + key + '".')
  }
}
