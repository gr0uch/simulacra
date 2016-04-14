'use strict'

module.exports = processNodes


/**
 * Internal function to remove bound nodes and replace them with markers.
 *
 * @param {*}
 * @param {Node}
 * @param {Object}
 * @return {Node}
 */
function processNodes (scope, node, def) {
  var document = scope ? scope.document : window.document
  var map = matchNodes(scope, node, def)
  var branch, key, mirrorNode, parent

  for (key in def) {
    branch = def[key]
    if (branch.__isBoundToParent) continue
    mirrorNode = map.get(branch.node)
    parent = mirrorNode.parentNode

    if (processNodes.useCommentNode) {
      branch.marker = parent.insertBefore(
        document.createComment(' end "' + key + '" '), mirrorNode)
      parent.insertBefore(document.createComment(
        ' begin "' + key + '" '), branch.marker)
    }
    else branch.marker = parent.insertBefore(
      document.createTextNode(''), mirrorNode)

    parent.removeChild(mirrorNode)
  }

  return node
}


/**
 * Internal function to find matching DOM nodes on cloned nodes.
 *
 * @param {*}
 * @param {Node} node
 * @param {Object} def
 * @return {WeakMap}
 */
function matchNodes (scope, node, def) {
  var document = scope ? scope.document : window.document
  var NodeFilter = scope ? scope.NodeFilter : window.NodeFilter
  var treeWalker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT)
  var map = new WeakMap()
  var nodes = []
  var i, j, key, currentNode

  for (key in def) nodes.push(def[key].node)

  while (treeWalker.nextNode() && nodes.length)
    for (i = 0, j = nodes.length; i < j; i++) {
      currentNode = nodes[i]
      if (treeWalker.currentNode.isEqualNode(currentNode)) {
        map.set(currentNode, treeWalker.currentNode)
        nodes.splice(i, 1)
      }
    }

  return map
}
