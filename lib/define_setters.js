'use strict'

var processNodes = require('./process_nodes')

module.exports = defineSetters

/**
 * Define setters. This function does most of the heavy lifting.
 *
 * @param {Object} obj
 * @param {Object} def
 */
function defineSetters (obj, def) {
  // Using the closure here to store private object.
  var store = {}

  var keys = Object.keys(obj)
  var i, j, key

  for (i = 0, j = keys.length; i < j; i++) {
    key = keys[i]
    store[key] = obj[key]
    define(key)
  }

  function define (key) {
    var mount = def[key].mount
    var unmount = def[key].unmount
    var definition = def[key].definition

    // Keeping state in this closure.
    var activeNodes = []
    var previousValues = []

    Object.defineProperty(obj, key, {
      get: getter, set: setter, enumerable: true
    })

    // For initialization, call this once.
    setter(store[key])

    function getter () {
      return store[key]
    }

    function setter (x) {
      var values = Array.isArray(x) ? x : [ x ]
      var i, j, isEmpty, value, previousValue,
        node, activeNode, parentNode

      store[key] = x

      // Handle rendering to the DOM.
      j = Math.max(previousValues.length, values.length)

      for (i = 0; i < j; i++) {
        value = values[i]
        activeNode = activeNodes[i]
        previousValue = previousValues[i]
        isEmpty = value === null || value === void 0
        parentNode = def[key].marker.parentNode

        if (isEmpty) {
          delete previousValues[i]
          delete activeNodes[i]
          if (unmount) unmount(activeNode, value, previousValue)
          if (activeNode) parentNode.removeChild(activeNode)
          continue
        }

        if (previousValue === value) continue

        previousValues[i] = value

        if (unmount) unmount(activeNode, value, previousValue)
        if (activeNode) parentNode.removeChild(activeNode)

        if (mount) {
          node = def[key].node.cloneNode(true)
          node = mount(node, value, previousValue) || node
          activeNodes[i] = parentNode.insertBefore(node, def[key].marker)
          continue
        }

        if (definition) {
          node = processNodes(def[key].node.cloneNode(true), definition)
          defineSetters(value, definition)
          activeNodes[i] = parentNode.insertBefore(node, def[key].marker)
          continue
        }
      }

      // Reset length to current values.
      previousValues.length = activeNodes.length = values.length
    }
  }
}
