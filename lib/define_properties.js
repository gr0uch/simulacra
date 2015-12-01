'use strict'

var processNodes = require('./process_nodes')

module.exports = defineProperties


/**
 * Define getters & setters. This function does most of the heavy lifting.
 *
 * @param {Object} obj
 * @param {Object} def
 * @param {Node} parentNode
 */
function defineProperties (obj, def, parentNode) {
  // Using the closure here to store private object.
  var store = {}

  var properties = Object.keys(def)
  var i, j

  for (i = 0, j = properties.length; i < j; i++) define(properties[i])

  function define (key) {
    var initialValue = obj[key]
    var branch = def[key]
    var mutator = branch.mutator
    var definition = branch.definition

    // Keeping state in this closure.
    var activeNodes = []
    var previousValues = []

    Object.defineProperty(obj, key, {
      get: getter, set: setter, enumerable: true
    })

    // For initialization, call this once.
    setter(initialValue)

    function getter () {
      return store[key]
    }

    function setter (x) {
      var i, j

      // Special case for binding same node as parent.
      if (branch.__isBoundToParent) {
        if (mutator) mutator(parentNode, x, store[key])
        else if (definition) defineProperties(x, definition, parentNode)
        store[key] = x
        return null
      }

      store[key] = x

      if (!Array.isArray(x)) x = [ x ]

      // Assign custom mutator methods on the array instance.
      else if (!x.__hasMutators) {
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
        x.unshift = unshift
        x.splice = splice

        // Handle array index assignment.
        for (i = 0, j = x.length; i < j; i++) defineIndex(x, i)
      }

      // Handle rendering to the DOM.
      for (i = 0, j = Math.max(previousValues.length, x.length); i < j; i++)
        checkValue(x, i)

      // Reset length to current values, implicitly deleting indices from
      // `previousValues` and `activeNodes` and allowing for garbage
      // collection.
      previousValues.length = activeNodes.length = x.length

      return store[key]
    }

    function checkValue (array, i) {
      var value = array[i]
      var previousValue = previousValues[i]

      if (previousValue === value) return

      addNode(value, previousValue, i)
    }

    function defineIndex (array, i) {
      var value = array[i]

      Object.defineProperty(array, i, {
        get: function () { return value },
        set: function (x) { value = x; checkValue(array, i) },
        enumerable: true, configurable: true
      })
    }

    function removeNode (value, previousValue, i) {
      var activeNode = activeNodes[i]

      // Cast previous value to null if undefined.
      if (previousValue === void 0) previousValue = null

      delete previousValues[i]

      if (activeNode) {
        mutator(activeNode, null, previousValue, i)
        branch.marker.parentNode.removeChild(activeNode)
        delete activeNodes[i]
      }
    }

    function addNode (value, previousValue, i) {
      var j, k, node, nextNode, activeNode = activeNodes[i]

      // Cast previous value to null if undefined.
      if (previousValue === void 0) previousValue = null

      // If value is undefined or null, just remove it.
      if (value == null) return removeNode(null, previousValue, i)

      previousValues[i] = value

      if (mutator) {
        if (activeNode) {
          mutator(activeNode, value, previousValue, i)
          return null
        }

        node = branch.node.cloneNode(true)
        mutator(node, value, previousValue, i)
      }

      else if (definition) {
        node = processNodes(branch.node.cloneNode(true), definition, i)
        defineProperties(value, definition, node)
      }

      // Find the next node.
      for (j = i + 1, k = activeNodes.length; j < k; j++)
        if (activeNodes[j]) {
          nextNode = activeNodes[j]
          break
        }

      activeNodes[i] = branch.marker.parentNode.insertBefore(
        node, nextNode || branch.marker)
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
      var value = Array.prototype.pop.call(this)

      removeNode(null, previousValue, i)
      previousValues.length = activeNodes.length = this.length

      return value
    }

    function push () {
      var i = this.length, j
      var value = Array.prototype.push.apply(this, arguments)

      for (j = i + arguments.length; i < j; i++) {
        addNode(this[i], null, i)
        defineIndex(this, i)
      }

      return value
    }

    function shift () {
      removeNode(null, previousValues[0], 0)

      Array.prototype.shift.call(previousValues)
      Array.prototype.shift.call(activeNodes)
      return Array.prototype.shift.call(this)
    }

    function unshift () {
      var i = this.length, j, value

      Array.prototype.unshift.apply(previousValues, arguments)
      Array.prototype.unshift.apply(activeNodes, Array(arguments.length))
      value = Array.prototype.unshift.apply(this, arguments)

      for (j = arguments.length; j--;) addNode(arguments[j], null, j)
      for (j = i + arguments.length; i < j; i++) defineIndex(this, i)

      return value
    }

    function splice (start, count) {
      var args = Array.prototype.slice.call(arguments, 2)
      var i, j, k = args.length - count, value

      for (i = start, j = start + count; i < j; i++)
        removeNode(null, previousValues[i], i)

      Array.prototype.splice.apply(previousValues, arguments)
      Array.prototype.splice.apply(activeNodes,
        [ start, count ].concat(Array(args.length)))
      value = Array.prototype.splice.apply(this, arguments)

      for (i = start + args.length - 1, j = start; i >= j; i--)
        addNode(args[(i - start) | 0], null, i)

      if (k < 0)
        previousValues.length = activeNodes.length = this.length

      else if (k > 0)
        for (i = this.length - k, j = this.length; i < j; i++)
          defineIndex(this, i)

      return value
    }
  }
}
