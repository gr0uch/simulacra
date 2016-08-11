'use strict'

var processNodes = require('./process_nodes')
var bindKeys = require('./bind_keys')
var keyMap = require('./key_map')

var isArray = Array.isArray
var hasDefinitionKey = keyMap.hasDefinition
var replaceAttributeKey = keyMap.replaceAttribute
var isBoundToParentKey = keyMap.isBoundToParent
var isProcessedKey = keyMap.isProcessed

// Node names which should have value replaced.
var replaceValue = [ 'INPUT', 'TEXTAREA', 'PROGRESS' ]

// Input types which use the "checked" attribute.
var replaceChecked = [ 'checkbox', 'radio' ]

// Symbol for retaining an element instead of removing it.
Object.defineProperty(simulacra, 'retainElement', {
  enumerable: true, value: keyMap.retainElement
})

// Option to use comment nodes as markers.
Object.defineProperty(simulacra, 'useCommentNode', {
  get: function () { return processNodes.useCommentNode },
  set: function (value) { processNodes.useCommentNode = value },
  enumerable: true
})


module.exports = simulacra


/**
 * Bind an object to the DOM.
 *
 * @param {Object} obj
 * @param {Object} def
 * @return {Node}
 */
function simulacra (obj, def) {
  var document = this ? this.document : window.document
  var Node = this ? this.Node : window.Node
  var node, query, path

  featureCheck(this || window)

  if (obj === null || typeof obj !== 'object' || isArray(obj))
    throw new TypeError('First argument must be a singular object.')

  if (!isArray(def))
    throw new TypeError('Second argument must be an array.')

  if (typeof def[0] === 'string') {
    query = def[0]
    def[0] = document.querySelector(query)
    if (!def[0]) throw new Error(
      'Top-level node "' + query + '" could not be found in the document.')
  }
  else if (!(def[0] instanceof Node)) throw new TypeError(
    'The first position of top-level must be a Node or a CSS selector string.')

  if (!def[isProcessedKey]) {
    ensureNodes(this, def[0], def[1])
    setFrozen(def)
  }

  node = processNodes(this, def[0], def[1])

  path = []
  path.root = obj
  bindKeys(this, obj, def[1], node, path)

  return node
}


/**
 * Internal function to mutate string selectors into Nodes and validate that
 * they are allowed.
 *
 * @param {Object} [scope]
 * @param {Node} parentNode
 * @param {Object} def
 */
function ensureNodes (scope, parentNode, def) {
  var Element = scope ? scope.Element : window.Element
  var adjacentNodes = []
  var i, j, key, query, branch, boundNode, ancestorNode

  if (typeof def !== 'object') throw new TypeError(
    'The second position must be an object.')

  for (key in def) {
    branch = def[key]

    // Change function or definition object bound to parent.
    if (typeof branch === 'function' || (typeof branch === 'object' &&
      branch !== null && !Array.isArray(branch)))
      def[key] = branch = [ parentNode, branch ]

    // Cast CSS selector string to array.
    else if (typeof branch === 'string') def[key] = branch = [ branch ]

    else if (!Array.isArray(branch))
      throw new TypeError('The binding on key "' + key + '" is invalid.')

    // Dereference CSS selector string to actual DOM Node.
    if (typeof branch[0] === 'string') {
      query = branch[0]

      // May need to get the node above the parent, in case of binding to
      // the parent node.
      ancestorNode = parentNode.parentNode || parentNode

      branch[0] = ancestorNode.querySelector(query)
      if (!branch[0]) throw new Error(
        'The element for selector "' + query + '" was not found.')
    }
    else if (!(branch[0] instanceof Element))
      throw new TypeError('The first position on key "' + key +
        '" must be a DOM element or a CSS selector string.')

    boundNode = branch[0]

    if (typeof branch[1] === 'object' && branch[1] !== null) {
      Object.defineProperty(branch, hasDefinitionKey, { value: true })
      if (branch[2] && typeof branch[2] !== 'function')
        throw new TypeError('The third position on key "' + key +
          '" must be a function.')
    }
    else if (branch[1] && typeof branch[1] !== 'function')
      throw new TypeError('The second position on key "' + key +
        '" must be an object or a function.')

    // Special case for binding to parent node.
    if (parentNode === boundNode) {
      Object.defineProperty(branch, isBoundToParentKey, { value: true })
      if (branch[hasDefinitionKey]) ensureNodes(scope, boundNode, branch[1])
      else if (typeof branch[1] !== 'function')
        console.warn( // eslint-disable-line
          'A change function was not defined on the key "' + key + '".')
      setFrozen(branch)
      continue
    }
    else adjacentNodes.push([ key, boundNode ])

    if (!parentNode.contains(boundNode))
      throw new Error('The bound DOM element must be either ' +
        'contained in or equal to the element in its parent binding.')

    if (branch[hasDefinitionKey]) {
      ensureNodes(scope, boundNode, branch[1])
      setFrozen(branch)
      continue
    }

    Object.defineProperty(branch, replaceAttributeKey, {
      value: ~replaceValue.indexOf(boundNode.nodeName) ?
        ~replaceChecked.indexOf(boundNode.type) ?
        'checked' : 'value' : 'textContent'
    })

    setFrozen(branch)
  }

  // Need to loop again to invalidate containment in adjacent nodes, after the
  // adjacent nodes are found.
  for (key in def) {
    boundNode = def[key][0]
    for (i = 0, j = adjacentNodes.length; i < j; i++)
      if (adjacentNodes[i][1].contains(boundNode) &&
        adjacentNodes[i][1] !== boundNode)
        throw new Error(
          'The element for key "' + key + '" is contained in the ' +
          'element for the adjacent key "' + adjacentNodes[i][0] + '".')
  }

  // Freeze the definition.
  setFrozen(def)
}


function setFrozen (obj) {
  Object.defineProperty(obj, isProcessedKey, { value: true })
  Object.freeze(obj)
}


// Feature checks.
function featureCheck (globalScope) {
  var features = [
    // ECMAScript features.
    [ Object, 'defineProperty' ],
    [ Object, 'freeze' ],
    [ Object, 'isFrozen' ],
    [ WeakMap ],

    // DOM features.
    [ 'document', 'createDocumentFragment' ],
    [ 'document', 'createTreeWalker' ],
    [ 'Node', 'prototype', 'appendChild' ],
    [ 'Node', 'prototype', 'contains' ],
    [ 'Node', 'prototype', 'insertBefore' ],
    [ 'Node', 'prototype', 'isEqualNode' ],
    [ 'Node', 'prototype', 'removeChild' ]
  ]
  var i, j, k, l, feature, path

  for (i = 0, j = features.length; i < j; i++) {
    path = features[i]

    if (typeof path[0] === 'string') {
      feature = globalScope

      for (k = 0, l = path.length; k < l; k++) {
        if (!(path[k] in feature)) throw new Error('Missing ' +
          path.slice(0, k + 1).join('.') + ' feature which is required.')

        feature = feature[path[k]]
      }
    }

    else {
      feature = path[0]

      for (k = 1, l = path.length; k < l; k++) {
        if (k > 1) feature = feature[path[k]]

        if (typeof feature === 'undefined') throw new Error('Missing ' +
          path[0].name + path.slice(1, k + 1).join('.') +
          ' feature which is required.')
      }
    }
  }
}
