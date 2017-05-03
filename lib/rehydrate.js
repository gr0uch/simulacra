'use strict'

var processNodes = require('./process_nodes')
var bindKeys = require('./bind_keys')
var keyMap = require('./key_map')

var hasDefinitionKey = keyMap.hasDefinition
var isBoundToParentKey = keyMap.isBoundToParent
var markerKey = keyMap.marker
var metaKey = keyMap.meta
var acceptNode = processNodes.acceptNode

// A fixed constant for `NodeFilter.SHOW_ELEMENT`.
var whatToShow = 0x00000001

// Fixed constant for comment node type.
var COMMENT_NODE = 8

module.exports = rehydrate


/**
 * Rehydration of existing DOM nodes by recursively checking equality.
 *
 * @param {*} scope
 * @param {Object} obj
 * @param {Object} def
 * @param {Node} node
 * @param {Node} matchNode
 */
function rehydrate (scope, obj, def, node, matchNode) {
  var document = scope ? scope.document : window.document

  var key, branch, x, value, change, definition, mount, keyPath
  var meta, valueIsArray, activeNodes, index, treeWalker, currentNode

  for (key in def) {
    branch = def[key]
    meta = obj[metaKey][key]
    change = !branch[hasDefinitionKey] && branch[1]
    definition = branch[hasDefinitionKey] && branch[1]
    mount = branch[2]
    keyPath = meta.keyPath

    if (branch[isBoundToParentKey]) {
      x = obj[key]

      if (definition && x !== null && x !== void 0)
        bindKeys(scope, x, definition, matchNode, keyPath)
      else if (change)
        change(matchNode, x, null, keyPath)

      continue
    }

    activeNodes = meta.activeNodes
    if (!activeNodes.length) continue

    valueIsArray = meta.valueIsArray
    x = valueIsArray ? obj[key] : [ obj[key] ]
    index = 0
    treeWalker = document.createTreeWalker(
      matchNode, whatToShow, acceptNode, false)

    while (index < activeNodes.length && treeWalker.nextNode()) {
      currentNode = activeNodes[index]

      if (treeWalker.currentNode.isEqualNode(currentNode)) {
        activeNodes.splice(index, 1, treeWalker.currentNode)

        value = x[index]

        if (valueIsArray) keyPath.index = index
        else delete keyPath.index

        if (definition) {
          rehydrate(scope, value, definition,
            currentNode, treeWalker.currentNode)

          if (mount) {
            keyPath.target = value
            mount(treeWalker.currentNode, value, null, keyPath)
          }
        }
        else if (change)
          change(treeWalker.currentNode, value, null, keyPath)

        index++
      }
    }

    if (index !== activeNodes.length) throw new Error(
      'Matching nodes could not be found on key "' + key + '", expected ' +
      activeNodes.length + ', found ' + index + '.')

    // Rehydrate marker node.
    currentNode = treeWalker.currentNode

    // Try to re-use comment node.
    if (processNodes.useCommentNode &&
      currentNode.nextSibling !== null &&
      currentNode.nextSibling.nodeType === COMMENT_NODE)
      branch[markerKey] = currentNode.nextSibling
    else branch[markerKey] = currentNode.parentNode.insertBefore(
      document.createTextNode(''), currentNode.nextSibling)
  }
}
