'use strict'

var findNodes = require('./find_nodes')

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
  var keys = Object.keys(def)
  var map = findNodes(scope, node, def)
  var i, j, branch, key, mirrorNode, marker, parent

  for (i = 0, j = keys.length; i < j; i++) {
    key = keys[i]
    branch = def[key]
    if (branch.__isBoundToParent) continue
    mirrorNode = map.get(branch.node)
    parent = mirrorNode.parentNode
    marker = document.createTextNode('')
    branch.marker = parent.insertBefore(marker, mirrorNode)
    parent.removeChild(mirrorNode)
  }

  return node
}
