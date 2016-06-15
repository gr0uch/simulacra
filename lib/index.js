'use strict'

var simulacra = require('./core')
var bindKeys = require('./bind_keys')
var processNodes = require('./process_nodes')

// Option to use comment nodes as markers.
Object.defineProperty(bindObject, 'useCommentNode', {
  get: function () { return processNodes.useCommentNode },
  set: function (value) { processNodes.useCommentNode = value },
  enumerable: true
})

bindKeys.retainElement = simulacra.retainElement


// Default entry point of the package.
module.exports = bindObject


/**
 * Wrapper around internal function.
 */
function bindObject (obj, def) {
  var node = simulacra.call(this, obj, def)
  var path = []

  path.root = obj
  bindKeys(this, obj, def[1], node, path)

  return node
}
