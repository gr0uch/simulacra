'use strict'

var keyMap = require('./key_map')

var isBoundToParentKey = keyMap.isBoundToParent
var markerKey = keyMap.marker
var matchedNodeKey = keyMap.matchedNode
var templateKey = keyMap.template
var isMarkerLastKey = keyMap.isMarkerLast

// A fixed constant for `NodeFilter.SHOW_ALL`.
var showAll = 0xFFFFFFFF

// Option to use comment nodes as markers.
processNodes.useCommentNode = false

// Avoiding duplication of compatibility hack.
processNodes.acceptNode = acceptNode

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
  var key, branch, result, mirrorNode, parent, marker, indices
  var i, j, treeWalker

  result = def[templateKey]

  if (!result) {
    node = node.cloneNode(true)

    indices = []

    matchNodes(scope, node, def)

    for (key in def) {
      branch = def[key]
      if (branch[isBoundToParentKey]) continue

      result = branch[0][matchedNodeKey]
      indices.push(result.index)
      mirrorNode = result.node
      parent = mirrorNode.parentNode

      // This value is memoized so that `appendChild` can be used instead of
      // `insertBefore`, which is a performance optimization.
      if (mirrorNode.nextElementSibling === null)
        branch[isMarkerLastKey] = true

      if (processNodes.useCommentNode) {
        marker = parent.insertBefore(
          document.createComment(' end "' + key + '" '), mirrorNode)
        parent.insertBefore(
          document.createComment(' begin "' + key + '" '), marker)
      }
      else marker = parent.insertBefore(
        document.createTextNode(''), mirrorNode)

      branch[markerKey] = marker

      parent.removeChild(mirrorNode)
    }

    Object.defineProperty(def, templateKey, {
      value: {
        node: node.cloneNode(true),
        indices: indices
      }
    })
  }
  else {
    node = result.node.cloneNode(true)
    indices = result.indices
    i = 0
    j = 0

    treeWalker = document.createTreeWalker(
      node, showAll, acceptNode, false)

    for (key in def) {
      branch = def[key]
      if (branch[isBoundToParentKey]) continue

      while (treeWalker.nextNode()) {
        if (i === indices[j]) {
          branch[markerKey] = treeWalker.currentNode
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
 * Internal function to find and set matching DOM nodes on cloned nodes.
 *
 * @param {*} [scope]
 * @param {Node} node
 * @param {Object} def
 */
function matchNodes (scope, node, def) {
  var document = scope ? scope.document : window.document
  var treeWalker = document.createTreeWalker(
    node, showAll, acceptNode, false)
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
        Object.defineProperty(currentNode, matchedNodeKey, {
          value: {
            index: nodeIndex + offset,
            node: treeWalker.currentNode
          }
        })
        if (processNodes.useCommentNode) offset++
        childWalker = document.createTreeWalker(
          currentNode, showAll, acceptNode, false)
        while (childWalker.nextNode()) offset--
        nodes.splice(i, 1)
        break
      }
    }

    nodeIndex++
  }
}


// A crazy Internet Explorer workaround.
function acceptNode () { return 1 }
acceptNode.acceptNode = acceptNode
