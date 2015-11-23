'use strict'

var processNodes = require('./process_nodes')

module.exports = defineProperties

/**
 * Define getters & setters. This function does most of the heavy lifting.
 *
 * @param {Object} obj
 * @param {Object} def
 */
function defineProperties (obj, def) {
  // Using the closure here to store private object.
  var store = {}

  var properties = Object.keys(obj)
  var i, j, property

  for (i = 0, j = properties.length; i < j; i++) {
    property = properties[i]
    store[property] = obj[property]
    define(property)
  }

  function define (key) {
    var branch = def[key]
    var mount = branch.mount
    var unmount = branch.unmount
    var definition = branch.definition

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
        parentNode = branch.marker.parentNode

        if (isEmpty) {
          delete previousValues[i]
          delete activeNodes[i]
          if (unmount) unmount(activeNode, value, previousValue, i)
          if (activeNode) parentNode.removeChild(activeNode)
          continue
        }

        if (previousValue === value) continue

        previousValues[i] = value

        if (unmount) unmount(activeNode, value, previousValue, i)
        if (activeNode) parentNode.removeChild(activeNode)

        if (mount) {
          node = branch.node.cloneNode(true)
          node = mount(node, value, previousValue, i) || node
        }

        else if (definition) {
          node = processNodes(branch.node.cloneNode(true), definition)
          defineProperties(value, definition)
        }

        activeNodes[i] = parentNode.insertBefore(node,
          activeNodes[i + 1] || branch.marker)
      }

      // Reset length to current values.
      previousValues.length = activeNodes.length = values.length
    }
  }
}
