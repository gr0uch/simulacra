'use strict'

var keyMap = require('./key_map')

var isBoundToParentKey = keyMap.isBoundToParent
var markerKey = keyMap.marker


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
  var defKeys = Object.keys(def)
  var map = matchNodes(scope, node, def)
  var i, j, branch, key, mirrorNode, parent

  for (i = 0, j = defKeys.length; i < j; i++) {
    key = defKeys[i]
    branch = def[key]
    if (branch[isBoundToParentKey]) continue

    mirrorNode = map.get(branch[0])
    parent = mirrorNode.parentNode

    if (processNodes.useCommentNode) {
      branch[markerKey] = parent.insertBefore(document.createComment(
          ' end "' + key + '" '), mirrorNode)
      parent.insertBefore(document.createComment(
        ' begin "' + key + '" '), branch[markerKey])
    }
    else branch[markerKey] = parent.insertBefore(
      document.createTextNode(''), mirrorNode)

    parent.removeChild(mirrorNode)
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
  var NodeFilter = scope ? scope.NodeFilter : window.NodeFilter
  var treeWalker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT)
  var map = new WeakMap()
  var defKeys = Object.keys(def)
  var nodes = []
  var i, j, currentNode

  for (i = 0, j = defKeys.length; i < j; i++) nodes.push(def[defKeys[i]][0])

  while (treeWalker.nextNode() && nodes.length)
    for (i = 0, j = nodes.length; i < j; i++) {
      currentNode = nodes[i]
      if (treeWalker.currentNode.isEqualNode(currentNode)) {
        map.set(currentNode, treeWalker.currentNode)
        nodes.splice(i, 1)
        break
      }
    }

  return map
}
