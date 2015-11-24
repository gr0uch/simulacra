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
    var parentNode = branch.marker.parentNode

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
      var i, j

      store[key] = x

      if (Array.isArray(x)) {
        // Assign custom mutator methods on the array instance.
        if (!x.__hasMutators) {
          x.__hasMutators = true

          // These mutators preserve length.
          x.reverse = reverse
          x.sort = sort
          x.copyWithin = copyWithin
          x.fill = fill

          // These mutators may alter length.
          x.pop = pop
          x.push = push
          x.shift = shift

          // Handle array index assignment.
          for (i = 0, j = x.length; i < j; i++) defineIndex(x, i)
        }
      }
      else x = [ x ]

      // Handle rendering to the DOM.
      j = Math.max(previousValues.length, x.length)

      for (i = 0; i < j; i++) checkValue(x, i)

      // Reset length to current values, implicitly deleting indices from
      // `previousValues` and `activeNodes` and allowing for garbage
      // collection.
      previousValues.length = activeNodes.length = x.length

      return x
    }

    function checkValue (array, i) {
      var value = array[i]
      var activeNode = activeNodes[i]
      var previousValue = previousValues[i]

      if (previousValue === value) return

      removeNode(value, previousValue, i)
      addNode(value, previousValue, i)
    }

    function defineIndex (array, i) {
      var value = array[i]

      Object.defineProperty(array, i, {
        get: function () { return value },
        set: function (y) { value = y; checkValue(array, i) },
        enumerable: true, configurable: true
      })
    }

    function removeNode (value, previousValue, i) {
      var activeNode = activeNodes[i]

      if (activeNode) {
        if (unmount) unmount(activeNode, value, previousValue, i)
        parentNode.removeChild(activeNode)
      }
    }

    function addNode (value, previousValue, i) {
      var node

      previousValues[i] = value

      if (value === null || value === void 0) return

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


    // =======================================
    // Below are array mutator methods.
    // They have to exist within this closure.
    // =======================================

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

    function pop () {
      var i = this.length - 1
      var previousValue = previousValues[i]

      Array.prototype.pop.call(this)
      removeNode(null, previousValue, i)
      previousValues.length = activeNodes.length = this.length
    }

    function push () {
      var i = this.length, j

      Array.prototype.push.apply(this, arguments)
      for (j = i + arguments.length; i < j; i++) {
        addNode(this[i], null, i)
        defineIndex(this, i)
      }
    }

    function shift () {
      removeNode(null, previousValues[0], 0)
      Array.prototype.shift.call(previousValues)
      Array.prototype.shift.call(activeNodes)
      Array.prototype.shift.call(this)
    }
  }
}
