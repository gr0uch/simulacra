'use strict'

var findNodes = require('./find_nodes')

module.exports = processNodes


/**
 * Internal function to remove bound nodes and replace them with markers.
 *
 * @param {Node}
 * @param {Object}
 * @return {Node}
 */
function processNodes (node, def) {
  var keys = Object.keys(def)
  var map = findNodes(node, def)
  var i, j, branch, key, mirrorNode, marker, parent

  for (i = 0, j = keys.length; i < j; i++) {
    key = keys[i]
    branch = def[key]
    if (branch.isBoundToParent) continue
    mirrorNode = map.get(branch.node)
    parent = mirrorNode.parentNode
    marker = document.createComment(' end "' + key + '" ')
    branch.marker = parent.insertBefore(marker, mirrorNode)
    parent.insertBefore(
      document.createComment(' begin "' + key + '" '), marker)
    parent.removeChild(mirrorNode)
  }

  return node
}
