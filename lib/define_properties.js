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
      var i, j, values

      store[key] = x

      if (Array.isArray(x)) {
        // Assign custom mutator methods on the array instance.
        if (!x.__hasMutators) {
          x.__hasMutators = true
          x.reverse = reverse
          x.sort = sort
          x.copyWithin = copyWithin
          x.fill = fill

          // Handle array index assignment.
          for (i = 0, j = x.length; i < j; i++) defineIndex(i)
        }

        values = x
      }
      else values = [ x ]

      // Handle rendering to the DOM.
      j = Math.max(previousValues.length, values.length)

      for (i = 0; i < j; i++) checkValue(i)

      // Reset length to current values, implicitly deleting indices from
      // `previousValues` and `activeNodes`.
      resetLength()

      return x

      function checkValue (i) {
        var value = values[i]
        var activeNode = activeNodes[i]
        var previousValue = previousValues[i]
        var isEmpty = value === null || value === void 0
        var parentNode = branch.marker.parentNode
        var node

        if (previousValue === value) return

        if (activeNode) {
          if (unmount) unmount(activeNode, value, previousValue, i)
          parentNode.removeChild(activeNode)
        }

        if (isEmpty) {
          delete previousValues[i]
          delete activeNodes[i]
          return
        }

        if (mount) {
          node = branch.node.cloneNode(true)
          node = mount(node, value, previousValue, i) || node
        }

        else if (definition) {
          node = processNodes(branch.node.cloneNode(true), definition)
          defineProperties(value, definition)
        }

        previousValues[i] = value
        activeNodes[i] = parentNode.insertBefore(node,
          activeNodes[i + 1] || branch.marker)
      }

      function resetLength () {
        previousValues.length = activeNodes.length = values.length
      }

      function defineIndex (i) {
        var value = x[i]

        Object.defineProperty(x, i, {
          get: function () { return value },
          set: function (y) { value = y; checkValue(i) },
          enumerable: true, configurable: true
        })
      }
    }

    function reverse () {
      return setter(Array.prototype.reverse.call(this))
    }

    function sort (fn) {
      return setter(Array.prototype.sort.call(this, fn))
    }

    function fill (a, b, c) {
      return setter(Array.prototype.fill.call(this, a, b, c))
    }

    function copyWithin (a, b, c) {
      return setter(Array.prototype.copyWithin.call(this, a, b, c))
    }
  }
}
