
'use strict'

var keyMap = require('./key_map')

var isBoundToParentKey = keyMap.isBoundToParent

// Map from definition branches to marker nodes. This is necessary because the
// definitions are frozen and cannot be written to.
var markerMap = processNodes.markerMap = new WeakMap()

// Internal map from already processed definitions to ready-to-use nodes.
var templateMap = new WeakMap()

// Option to use comment nodes as markers.
processNodes.useCommentNode = false


module.exports = processNodes


/**
 * Internal function to remove bound nodes and replace them with markers.
 *
 * @param {*} [scope]
 * @param {Node} node
 * @param {Object} def
 * @return {Node}
 */
function processNodes (scope, node, def) {
  var document = scope ? scope.document : window.document
  var key, branch, result, mirrorNode, parent, marker, map, indices
  var i, j, treeWalker

  result = templateMap.get(def)

  if (!result) {
    node = node.cloneNode(true)
    map = matchNodes(scope, node, def)
    indices = []

    for (key in def) {
      branch = def[key]
      if (branch[isBoundToParentKey]) continue

      result = map.get(branch[0])
      indices.push(result.index)
      mirrorNode = result.node
      parent = mirrorNode.parentNode

      if (processNodes.useCommentNode) {
        marker = parent.insertBefore(document.createComment(
            ' end "' + key + '" '), mirrorNode)
        parent.insertBefore(document.createComment(
          ' begin "' + key + '" '), marker)
      }
      else marker = parent.insertBefore(
        document.createTextNode(''), mirrorNode)

      markerMap.set(branch, marker)

      parent.removeChild(mirrorNode)
    }

    templateMap.set(def, {
      node: node.cloneNode(true),
      indices: indices
    })
  }
  else {
    node = result.node.cloneNode(true)
    indices = result.indices
    i = 0
    j = 0

    treeWalker = document.createTreeWalker(node)

    for (key in def) {
      branch = def[key]
      if (branch[isBoundToParentKey]) continue

      while (treeWalker.nextNode()) {
        if (i === indices[j]) {
          markerMap.set(branch, treeWalker.currentNode)
          i++
          break
        }
        i++
      }

      j++
    }
  }

  return node
}


/**
 * Internal function to find matching DOM nodes on cloned nodes.
 *
 * @param {*} [scope]
 * @param {Node} node
 * @param {Object} def
 * @return {WeakMap}
 */
function matchNodes (scope, node, def) {
  var document = scope ? scope.document : window.document
  var treeWalker = document.createTreeWalker(node)
  var map = new WeakMap()
  var nodes = []
  var i, j, key, currentNode, childWalker
  var nodeIndex = 0

  // This offset is a bit tricky, it's used to determine the index of the
  // marker in the processed node, which depends on whether comment nodes
  // are used and the count of child nodes.
  var offset = processNodes.useCommentNode ? 1 : 0

  for (key in def) nodes.push(def[key][0])

  while (treeWalker.nextNode() && nodes.length) {
    for (i = 0, j = nodes.length; i < j; i++) {
      currentNode = nodes[i]
      if (treeWalker.currentNode.isEqualNode(currentNode)) {
        map.set(currentNode, {
          index: nodeIndex + offset,
          node: treeWalker.currentNode
        })
        if (processNodes.useCommentNode) offset++
        childWalker = document.createTreeWalker(currentNode)
        while (childWalker.nextNode()) offset--
        nodes.splice(i, 1)
        break
      }
    }

    nodeIndex++
  }

  return map
}
