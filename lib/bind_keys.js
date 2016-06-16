'use strict'

var processNodes = require('./process_nodes')
var keyMap = require('./key_map')

var hasBindingsKey = keyMap.hasBindings
var hasDefinitionKey = keyMap.hasDefinition
var isBoundToParentKey = keyMap.isBoundToParent
var hasMutatorsKey = keyMap.hasMutators
var markerKey = keyMap.marker
var replaceAttributeKey = keyMap.replaceAttribute


module.exports = bindKeys


/**
 * Define getters & setters. This function does most of the heavy lifting.
 *
 * @param {*} [scope]
 * @param {Object} obj
 * @param {Object} def
 * @param {Node} parentNode - This is not the same as
 * `Node.prototype.parentNode`, this is the internal parent node if the key
 * was bound to its parent.
 * @param {Array} path
 */
function bindKeys (scope, obj, def, parentNode, path) {
  var document = scope ? scope.document : window.document

  // Using the closure here to store private object.
  var store = {}
  var defKeys = Object.keys(def)
  var i, j

  if (typeof obj !== 'object')
    throw new TypeError(
      'Invalid type of value "' + obj + '", object expected.')

  if (obj[hasBindingsKey])
    throw new Error('Can not re-assign bound object.')

  Object.defineProperty(obj, hasBindingsKey, { value: true })

  for (i = 0, j = defKeys.length; i < j; i++) bindKey(defKeys[i])

  function bindKey (key) {
    var initialValue = obj[key]
    var branch = def[key]
    var node = branch[0]
    var change = !branch[hasDefinitionKey] && branch[1]
    var definition = branch[hasDefinitionKey] && branch[1]
    var mount = branch[2]
    var marker = branch[markerKey]

    // Keeping state in this closure.
    var keyPath = path.concat(key)
    var activeNodes = []
    var previousValues = []
    var isArray

    // Assign root and target object.
    keyPath.root = path.root
    keyPath.target = obj

    Object.defineProperty(obj, key, {
      get: function () { return store[key] },
      set: setter, enumerable: true
    })

    // For initialization, call this once.
    setter(initialValue)

    function setter (x) {
      var fragment, value, previousValue, currentNode, nextNode
      var a, b, i, j, k, l

      // Special case for binding same node as parent.
      if (branch[isBoundToParentKey]) {
        previousValue = store[key]
        store[key] = x

        // Check for no-op.
        if (x === previousValue) return null

        // Need to qualify this check for non-empty value.
        if (definition && x != null)
          bindKeys(scope, x, definition, parentNode, keyPath)

        else if (change) change(parentNode, x, previousValue, keyPath)

        return null
      }

      store[key] = x
      isArray = Array.isArray(x)
      value = isArray ? x : [ x ]

      // Assign custom mutator methods on the array instance.
      if (isArray) {
        if (value[hasMutatorsKey]) throw new Error(
          'Can not re-assign bound array on field "' + key + '".')

        Object.defineProperty(value, hasMutatorsKey, { value: true })

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
        for (i = 0, j = value.length; i < j; i++)
          defineIndex(value, i)
      }

      // Handle rendering to the DOM. This algorithm tries to batch insertions
      // into as few document fragments as possible.
      for (i = 0, j = Math.max(previousValues.length, value.length);
        i < j; i++) {
        a = value[i]
        b = previousValues[i]
        currentNode = a !== b ? replaceNode(a, b, i) : null

        if (currentNode) {
          if (!fragment) fragment = document.createDocumentFragment()
          fragment.appendChild(currentNode)
          continue
        }

        // If the value was empty and a current fragment exists, need to insert
        // the current document fragment.
        if (!fragment) continue

        nextNode = null
        for (k = i + 1, l = activeNodes.length; k < l; k++)
          if (activeNodes[k]) {
            nextNode = activeNodes[k]
            break
          }

        marker.parentNode.insertBefore(fragment, nextNode || marker)
      }

      // Terminal behavior.
      if (fragment)
        marker.parentNode.insertBefore(fragment, marker)

      // Reset length to current values, implicitly deleting indices and
      // allowing for garbage collection.
      if (value.length !== previousValues.length)
        previousValues.length = activeNodes.length = value.length

      return x
    }

    function defineIndex (array, i) {
      var value = array[i]

      Object.defineProperty(array, i, {
        get: function () { return value },
        set: function (x) {
          var a, b, j, k, currentNode, nextNode

          value = x
          a = array[i]
          b = previousValues[i]

          if (a !== b) currentNode = replaceNode(a, b, i)

          if (currentNode) {
            for (j = i + 1, k = activeNodes.length; j < k; j++)
              if (activeNodes[j]) {
                nextNode = activeNodes[j]
                break
              }

            marker.parentNode.insertBefore(currentNode, nextNode || marker)
          }
        },
        enumerable: true
      })
    }

    function removeNode (value, previous, i) {
      var activeNode = activeNodes[i]
      var endPath = keyPath
      var returnValue, j

      // Cast previous value to null if undefined.
      var previousValue = previous === void 0 ? null : previous

      delete previousValues[i]

      if (activeNode) {
        if (isArray) {
          endPath = keyPath.concat(i)
          endPath.root = path.root
          endPath.target = path.target
        }

        if (change)
          returnValue = change(activeNode, null, previousValue, endPath)
        else if (definition && mount) {
          endPath.target = endPath.root

          for (j = 0; j < keyPath.length - 1; j++)
            endPath.target = endPath.target[keyPath[j]]

          returnValue = mount(activeNode, null, endPath)
        }

        // If a change or mount function returns the retain element symbol,
        // skip removing the element from the DOM.
        if (returnValue !== bindKeys.retainElement)
          marker.parentNode.removeChild(activeNode)

        delete activeNodes[i]
      }
    }

    // The return value of this function is a Node to be added, otherwise null.
    function replaceNode (value, previous, i) {
      var activeNode = activeNodes[i]
      var currentNode = node
      var endPath = keyPath
      var j, k, returnValue

      // Cast previous value to null if undefined.
      var previousValue = previous === void 0 ? null : previous

      // If value is undefined or null, just remove it.
      if (value == null) {
        removeNode(null, previousValue, i)
        return null
      }

      if (isArray) {
        endPath = keyPath.concat(i)
        endPath.root = path.root
        endPath.target = path.target
      }

      previousValues[i] = value

      if (definition) {
        if (activeNode) removeNode(value, previousValue, i)
        currentNode = processNodes(scope, node.cloneNode(true), definition)
        endPath.target = isArray ? value[i] : value
        bindKeys(scope, value, definition, currentNode, endPath)
        if (mount) {
          endPath.target = endPath.root

          for (j = 0, k = keyPath.length - 1; j < k; j++)
            endPath.target = endPath.target[keyPath[j]]

          mount(currentNode, value, endPath)
        }
      }

      else {
        currentNode = activeNode || node.cloneNode(true)
        returnValue = change ?
          change(currentNode, value, previousValue, endPath) :
          value !== void 0 ? value : null

        if (returnValue !== void 0)
          changeValue(currentNode, returnValue, branch[replaceAttributeKey])
      }

      // Do not actually add an element to the DOM if it's only a change
      // between non-empty values.
      if (!definition && activeNode) return null

      activeNodes[i] = currentNode

      return currentNode
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
      var i = this.length
      var j, fragment, currentNode

      // Passing arguments to apply is fine.
      var value = Array.prototype.push.apply(this, arguments)

      if (arguments.length) {
        fragment = document.createDocumentFragment()

        for (j = i + arguments.length; i < j; i++) {
          currentNode = replaceNode(this[i], null, i)
          if (currentNode) fragment.appendChild(currentNode)
          defineIndex(this, i)
        }

        marker.parentNode.insertBefore(fragment, marker)
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
      var i = this.length
      var j, k, fragment, currentNode, nextNode

      // Passing arguments to apply is fine.
      var value = Array.prototype.unshift.apply(this, arguments)

      Array.prototype.unshift.apply(previousValues, arguments)
      Array.prototype.unshift.apply(activeNodes, Array(k))

      if (arguments.length) {
        fragment = document.createDocumentFragment()

        for (j = 0, k = arguments.length; j < k; j++) {
          currentNode = replaceNode(arguments[j], null, j)
          if (currentNode) fragment.appendChild(currentNode)
        }

        for (j = arguments.length, k = activeNodes.length; j < k; j++)
          if (activeNodes[j]) {
            nextNode = activeNodes[j]
            break
          }

        for (j = i + arguments.length; i < j; i++) defineIndex(this, i)

        marker.parentNode.insertBefore(fragment, nextNode || marker)
      }

      return value
    }

    function splice (start, count) {
      var insert = []
      var i, j, k, fragment, value, currentNode, nextNode

      for (i = start, j = start + count; i < j; i++)
        removeNode(null, previousValues[i], i)

      for (i = 2, j = arguments.length; i < j; i++) insert[i] = arguments[i]

      // Passing arguments to apply is fine.
      Array.prototype.splice.apply(previousValues, arguments)
      Array.prototype.splice.apply(activeNodes,
        [ start, count ].concat(Array(insert.length)))
      value = Array.prototype.splice.apply(this, arguments)

      if (insert.length) {
        fragment = document.createDocumentFragment()

        for (i = start + insert.length - 1, j = start; i >= j; i--) {
          currentNode = replaceNode(insert[i - start], null, i)
          if (currentNode) fragment.appendChild(currentNode)
        }

        for (i = start + insert.length, j = activeNodes.length; i < j; i++)
          if (activeNodes[i]) {
            nextNode = activeNodes[i]
            break
          }

        marker.parentNode.insertBefore(fragment, nextNode || marker)
      }

      k = insert.length - count

      if (k < 0)
        previousValues.length = activeNodes.length = this.length

      else if (k > 0)
        for (i = this.length - k, j = this.length; i < j; i++)
          defineIndex(this, i)

      return value
    }
  }
}


// Default behavior when a return value is given for a change function.
function changeValue (node, value, attribute) {
  switch (attribute) {
  case 'checked':
    if (value) node.checked = 'checked'
    else node.removeAttribute('checked')
    break
  default:
    node[attribute] = value
  }
}
