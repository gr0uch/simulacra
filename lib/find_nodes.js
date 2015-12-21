'use strict'

module.exports = findNodes


/**
 * Find matching DOM nodes on cloned nodes.
 *
 * @param {*}
 * @param {Node} node
 * @param {Object} definition
 * @return {WeakMap}
 */
function findNodes (scope, node, definition) {
  var document = scope ? scope.document : window.document
  var NodeFilter = scope ? scope.NodeFilter : window.NodeFilter
  var treeWalker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT)
  var keys = Object.keys(definition)
  var map = new WeakMap()
  var nodes = []
  var i, j

  for (i = 0, j = keys.length; i < j; i++)
    nodes[nodes.length] = definition[keys[i]].node

  while (treeWalker.nextNode() && j)
    for (i = 0, j = nodes.length; i < j; i++)
      if (treeWalker.currentNode.isEqualNode(nodes[i])) {
        map.set(nodes[i], treeWalker.currentNode)
        nodes.splice(i, 1)
      }

  return map
}
