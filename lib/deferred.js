'use strict'

var simulacra = require('./')
var processNodes = require('./process_nodes')
var changeValue = require('./change_value')
var keyMap = require('./key_map')

var activeNodesKey = keyMap.activeNodes
var hasDefinitionKey = keyMap.hasDefinition
var isBoundToParentKey = keyMap.isBoundToParent
var isDeferredKey = keyMap.isDeferred
var markerKey = keyMap.marker
var replaceAttributeKey = keyMap.replaceAttribute

// This maps from data objects which are passed into render, to the clone of
// a previous state of the data object.
var stateMap = new WeakMap()

// This maps data object to root node.
var rootMap = new WeakMap()

// This maps data object to definition.
var defMap = new WeakMap()


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
  var state = stateMap.get(obj)
  var node, path

  // Initialize path.
  path = []
  path.root = obj

  if (!def) {
    if (!state)
      throw new Error('Data object is not bound.')

    return reconcile(this, obj,
      defMap.get(obj)[1], rootMap.get(obj), path, state)
  }

  if (state)
    throw new Error('Data object was already bound.')

  Object.defineProperty(obj, isDeferredKey, { value: true })
  node = simulacra.call(this, obj, def)

  rootMap.set(obj, node)
  defMap.set(obj, def)

  // Initialize the internal state to an empty object.
  state = {}
  stateMap.set(obj, state)

  // The first call to reconcile will render the node immediately.
  reconcile(this, obj, def[1], node, path, state)

  return node
}


/**
 * Internal function to reconcile changes since render was called previously.
 * This functions calls itself recursively.
 *
 * @param {*} [scope]
 * @param {Object} obj
 * @param {Object} def
 * @param {Object} parentNode
 * @param {Object} path
 * @param {Object} state
 */
function reconcile (scope, obj, def, parentNode, path, state) {
  var defKeys = Object.keys(def)
  var key, branch, node, change, definition, mount, marker
  var value, target, targetIsArray
  var keyPath, endPath
  var activeNodes, currentNode, nextNode, returnValue
  var a, b, i, j, k, l, m, n

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
    marker = branch[markerKey]

    if (!branch[activeNodesKey])
      Object.defineProperty(branch, activeNodesKey, { value: [] })

    activeNodes = branch[activeNodesKey]

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
        reconcile(scope, target, definition, parentNode, keyPath, value || {})

      else if (change) change(parentNode, target, value, keyPath)

      continue
    }

    // These are used for comparison.
    value = state[key] || []
    targetIsArray = Array.isArray(obj[key])
    target = targetIsArray ? obj[key] : [ obj[key] ]

    for (k = 0, l = Math.max(value.length, target.length); k < l; k++) {
      a = value[k]
      b = target[k]
      endPath = keyPath

      if (targetIsArray) {
        endPath = keyPath.concat(k)
        endPath.root = path.root
        endPath.target = path.target
      }

      // Check for removal.
      if (b == null && a != null) {
        //activeNodes[k] = null
      }

      // Check for update.
      else if (b != null && a != null) {
      }

      // Check for insertion.
      else if (b != null && a == null) {
        if (definition) {
          currentNode = processNodes(scope, node.cloneNode(true), definition)
          endPath.target = targetIsArray ? b[k] : b
          reconcile(scope, b, definition, currentNode, endPath, {})
          if (mount) {
            endPath.target = endPath.root

            for (m = 0, n = keyPath.length - 1; m < n; m++)
              endPath.target = endPath.target[keyPath[m]]

            mount(currentNode, b, endPath)
          }
        }
        else {
          currentNode = node.cloneNode(true)
          returnValue = change ?
            change(currentNode, b, null, endPath) :
            b !== void 0 ? b : null

          if (returnValue !== void 0)
            changeValue(currentNode, returnValue, branch[replaceAttributeKey])
        }

        activeNodes[k] = currentNode

        nextNode = null
        for (m = k + 1, n = activeNodes.length; m < n; m++)
          if (activeNodes[m]) {
            nextNode = activeNodes[m]
            break
          }

        marker.parentNode.insertBefore(currentNode, nextNode || marker)
      }
    }

    activeNodes.length = target.length
    state[key] = target
  }
}
