'use strict'

var processNodes = require('./process_nodes')

module.exports = bindKeys


/**
 * Define getters & setters. This function does most of the heavy lifting.
 *
 * @param {*}
 * @param {Object} obj
 * @param {Object} def
 * @param {Node} parentNode
 * @param {Array} path
 */
function bindKeys (scope, obj, def, parentNode, path) {
  // Using the closure here to store private object.
  var store = {}
  var key

  if (typeof obj !== 'object')
    throw new TypeError(
      'Invalid type of value "' + obj + '", object expected.')

  for (key in def) define(key)

  function define (key) {
    var initialValue = obj[key]
    var branch = def[key]
    var mutator = branch.mutator
    var definition = branch.definition

    // Keeping state in this closure.
    var keyPath = path.concat(key)
    var activeNodes = []
    var previousValues = []
    var isArray

    // Assign root object.
    keyPath.root = path.root

    Object.defineProperty(obj, key, {
      get: getter, set: setter, enumerable: true
    })

    // For initialization, call this once.
    setter(initialValue)

    function getter () {
      return store[key]
    }

    function setter (x) {
      var i, j, value

      // Special case for binding same node as parent.
      if (branch.__isBoundToParent) {
        if (mutator) mutator(parentNode, x, store[key], keyPath)

        // Need to qualify this check for non-empty value.
        else if (definition && x != null)
          bindKeys(scope, x, definition, parentNode, keyPath)

        store[key] = x
        return null
      }

      isArray = Array.isArray(x)
      value = isArray ? x : [ x ]

      // Assign custom mutator methods on the array instance.
      if (isArray && !value.__hasMutators) {
        value.__hasMutators = true

        // These mutators preserve length.
        value.reverse = reverse
        value.sort = sort
        value.copyWithin = copyWithin
        value.fill = fill

        // These mutators may alter length.
        value.pop = pop
        value.push = push
        value.shift = shift
        value.unshift = unshift
        value.splice = splice

        // Handle array index assignment.
        for (i = 0, j = value.length; i < j; i++) defineIndex(value, i)
      }

      // Handle rendering to the DOM.
      for (i = 0, j = Math.max(previousValues.length, value.length);
        i < j; i++) checkValue(value, i)

      // Reset length to current values, implicitly deleting indices from
      // `previousValues` and `activeNodes` and allowing for garbage
      // collection.
      previousValues.length = activeNodes.length = value.length

      store[key] = x

      return x
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
      var endPath = keyPath
      var returnValue

      // Cast previous value to null if undefined.
      if (previousValue === void 0) previousValue = null

      delete previousValues[i]

      if (activeNode) {
        if (mutator) {
          if (isArray) {
            endPath = keyPath.concat(i)
            endPath.root = path.root
          }
          returnValue = mutator(activeNode, null, previousValue, endPath)
        }

        // If a mutator function returns false, skip the DOM operation.
        if (returnValue !== false)
          branch.marker.parentNode.removeChild(activeNode)

        delete activeNodes[i]
      }
    }

    function addNode (value, previousValue, i) {
      var j, k, node, nextNode, activeNode = activeNodes[i]
      var endPath = keyPath

      // Cast previous value to null if undefined.
      if (previousValue === void 0) previousValue = null

      // If value is undefined or null, just remove it.
      if (value == null) {
        removeNode(null, previousValue, i)
        return
      }

      if (isArray) {
        endPath = keyPath.concat(i)
        endPath.root = path.root
      }

      previousValues[i] = value

      if (mutator) {
        if (activeNode) {
          mutator(activeNode, value, previousValue, endPath)
          return
        }

        node = branch.node.cloneNode(true)
        mutator(node, value, previousValue, endPath)
      }

      else if (definition) {
        if (activeNode) removeNode(value, previousValue, i)
        node = processNodes(scope, branch.node.cloneNode(true), definition, i)
        bindKeys(scope, value, definition, node, endPath)
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
