'use strict'

var processNodes = require('./process_nodes')
var defineProperties = require('./define_properties')

module.exports = simulacra


/**
 * Dynamic dispatch function.
 *
 * @param {Node|String|Object}
 * @param {Function|Object}
 */
function simulacra (a, b) {
  var Node = this ? this.Node : window.Node

  if (typeof a === 'string' || a instanceof Node) return define(a, b)
  if (typeof a === 'object' && a !== null) return bind.call(this, a, b)

  throw new TypeError('First argument must be either ' +
    'a DOM Node, string, or an Object.')
}


/**
 * Define a binding.
 *
 * @param {Node|String}
 * @param {Function|Object}
 */
function define (node, def) {
  // Memoize the selected node.
  var obj = { node: node }

  if (typeof def === 'function')
    obj.mutator = def

  else if (typeof def === 'object')
    obj.definition = def

  else if (def !== void 0)
    throw new TypeError('Second argument must be either ' +
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
  var Node = this ? this.Node : window.Node
  var document = this ? this.document : window.document
  var node, query

  if (Array.isArray(obj))
    throw new TypeError('First argument must be a singular object.')

  if (!def || typeof def.definition !== 'object')
    throw new TypeError('Top-level binding must be an object.')

  if (!(def.node instanceof Node)) {
    query = def.node
    def.node = document.querySelector(query)
    if (!def.node) throw new Error(
      'Top-level Node "' + query + '" could not be found in the document.')
  }

  ensureNodes(def.node, def.definition, new WeakMap())

  node = processNodes(this, def.node.cloneNode(true), def.definition)
  defineProperties(this, obj, def.definition, node)

  return node
}


// Default DOM mutation functions.
function replaceText (node, value) { node.textContent = value }
function replaceValue (node, value) { node.value = value }
function replaceChecked (context) { node.checked = context.value }

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


/**
 * Internal function to mutate string selectors into Nodes and validate that
 * they are allowed.
 *
 * @param {Node} parentNode
 * @param {Object} def
 * @param {WeakMap} seen
 */
function ensureNodes (parentNode, def, seen) {
  var key, query, branch, boundNode, ancestorNode

  for (key in def) {
    branch = def[key]

    if (typeof branch.node === 'string') {
      query = branch.node

      // May need to get the node above the parent, in case of binding to
      // the parent node.
      ancestorNode = parentNode.parentNode || parentNode

      branch.node = ancestorNode.querySelector(query)
      if (!branch.node) throw new Error(
        'The Node for selector "' + query + '" was not found.')
    }

    boundNode = branch.node

    // Special case for binding to parent node.
    if (parentNode === boundNode) {
      branch.__isBoundToParent = true
      if (branch.mutator && branch.mutator.__isDefault)
        branch.mutator = noop(key)
      else if (branch.definition)
        ensureNodes(boundNode, branch.definition, seen)
      continue
    }

    if (!parentNode.contains(boundNode))
      throw new Error('The bound DOM Node must be either ' +
        'contained in or equal to its parent binding.')

    if (!seen.get(boundNode)) seen.set(boundNode, true)
    else throw new Error('Can not bind multiple keys to the same child ' +
      'DOM Node. Collision found on key "' + key + '".')

    if (branch.definition) ensureNodes(boundNode, branch.definition, seen)
    else if (!branch.mutator)
      if (boundNode.nodeName === 'INPUT' || boundNode.nodeName === 'SELECT')
        if (boundNode.type === 'checkbox' || boundNode.type === 'radio')
          branch.mutator = replaceChecked
        else branch.mutator = replaceValue
      else branch.mutator = replaceText
  }
}
