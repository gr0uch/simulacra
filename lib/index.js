'use strict'

var processNodes = require('./process_nodes')
var bindKeys = require('./bind_keys')

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

  ensureNodes(def.node, def.definition)

  node = processNodes(this, def.node.cloneNode(true), def.definition)
  bindKeys(this, obj, def.definition, node)

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
 */
function ensureNodes (parentNode, def) {
  var i, j, key, query, branch, boundNode, ancestorNode
  var adjacentNodes = []

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
        ensureNodes(boundNode, branch.definition)
      continue
    }
    else adjacentNodes.push([ key, boundNode ])

    if (!parentNode.contains(boundNode))
      throw new Error('The bound DOM Node must be either ' +
        'contained in or equal to its parent binding.')

    if (branch.definition) ensureNodes(boundNode, branch.definition)
    else if (!branch.mutator)
      if (boundNode.nodeName === 'INPUT' || boundNode.nodeName === 'SELECT')
        if (boundNode.type === 'checkbox' || boundNode.type === 'radio')
          branch.mutator = replaceChecked
        else branch.mutator = replaceValue
      else branch.mutator = replaceText
  }

  // Need to invalidate containment in adjacent nodes, after the adjacent
  // nodes are found.
  for (key in def) {
    boundNode = def[key].node
    for (i = 0, j = adjacentNodes.length; i < j; i++) {
      if (adjacentNodes[i][1].contains(boundNode) &&
        adjacentNodes[i][1] !== boundNode)
        throw new Error('The Node for key "' + key + '" is contained in the ' +
          'Node for the adjacent key "' + adjacentNodes[i][0] + '".')
    }
  }
}
