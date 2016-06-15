'use strict'

var simulacra = require('./')
var changeValue = require('./change_value')
var keyMap = require('./key_map')

var isArray = Array.isArray
var hasDefinitionKey = keyMap.hasDefinition
var isBoundToParentKey = keyMap.isBoundToParent
var isDeferredKey = keyMap.isDeferred
var markerKey = keyMap.marker
var replaceAttributeKey = keyMap.replaceAttribute

// This maps from data objects which are passed into render, to the clone of
// a previous state of the data object.
var dataMap = new WeakMap()


module.exports = render


/**
 * Deferred render function. Same signature as Simulacra.js, except passing in
 * only the data object will commit changes to the DOM.
 *
 * The differences are:
 * - Data object does not receive any getters or setters.
 * - No array mutator methods, or array optimizations.
 *
 * @param {Object} obj
 * @param {Object} def
 * @return {Node}
 */
function render (obj, def) {
  var state = dataMap.get(obj)
  var node, path

  if (!def) {
    if (!state)
      throw new Error('Data object is not bound.')

    return reconcile(obj, def, state)
  }

  if (state)
    throw new Error('Data object was already bound.')

  node = simulacra.call(this, obj, def)

  // Initialize the internal state to an empty object.
  state = {}
  dataMap.set(obj, state)

  Object.defineProperty(obj, isDeferredKey, { value: true })

  // Initialize path.
  path = []
  path.root = obj

  // The first call to reconcile will render the node immediately.
  reconcile(obj, def, node, path, state)

  return node
}


/**
 * Internal function to reconcile changes since render was called previously.
 * This functions calls itself recursively.
 *
 * @param {Object} obj
 * @param {Object} def
 * @param {Object} parentNode
 * @param {Object} path
 * @param {Object} state
 */
function reconcile (obj, def, parentNode, path, state) {
  var defKeys = Object.keys(def)
  var i, j, key, branch, node, change, definition, mount
  var k, l, value, target, keyPath
  var a, b, c

  if (typeof obj !== 'object')
    throw new TypeError(
      'Invalid type of value "' + obj + '", object expected.')

  for (i = 0, j = defKeys.length; i < j; i++) {
    key = defKeys[i]
    branch = def[key]
    node = branch[0]
    change = !branch[hasDefinitionKey] && branch[1]
    definition = branch[hasDefinitionKey] && branch[1]
    mount = branch[2]

    // Local path handling.
    keyPath = path.concat(key)
    keyPath.root = path.root
    keyPath.target = obj

    // Special case for binding same node as parent.
    if (branch[isBoundToParentKey]) {
      value = state[key]
      target = obj[key]
      state[key] = target

      if (value === target) continue

      if (definition && target != null)
        reconcile(target, definition, parentNode, keyPath)

      else if (change) change(parentNode, target, value, keyPath)

      continue
    }

    // These are used for comparison.
    value = state[key] || []
    target = isArray(obj[key]) ? obj[key] : [ obj[key] ]

    for (k = 0, l = Math.max(value.length, target.length); k < l; k++) {
      a = value[k]
      b = target[k]

      // Check for removal.
      if (b == null && a != null) {
      }

      // Check for update.
      if (b != null && a != null) {
      }

      // Check for insertion.
      if (b != null && a == null) {
      }
    }

    state[key] = target
  }
}
