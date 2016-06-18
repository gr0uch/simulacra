'use strict'

var processNodes = require('./process_nodes')
var keyMap = require('./key_map')

var hasBindingsKey = keyMap.hasBindings
var hasDefinitionKey = keyMap.hasDefinition
var isBoundToParentKey = keyMap.isBoundToParent
var markerKey = keyMap.marker
var replaceAttributeKey = keyMap.replaceAttribute
var retainElementKey = keyMap.retainElement


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

  if (typeof obj !== 'object' || obj === null)
    throw new TypeError(
      'Invalid type of value "' + obj + '", object expected.')

  // Internal function to bind all the keys, don't need to expose in closure.
  void function () {
    var defKeys = Object.keys(def)
    var i, j
    for (i = 0, j = defKeys.length; i < j; i++)
      bindKey(defKeys[i])
  }()

  function bindKey (key) {
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
    var valueIsArray

    // Assign root and target object.
    keyPath.root = path.root
    keyPath.target = obj

    // For initialization, call this once.
    setter(obj[key])

    Object.defineProperty(obj, key, {
      get: function () { return store[key] },
      set: setter,
      enumerable: true
    })

    function setter (x) {
      var fragment, value, previousValue, currentNode
      var a, b, i, j

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
      valueIsArray = Array.isArray(x)
      value = valueIsArray ? x : [ x ]

      // Assign custom mutator methods on the array instance.
      if (valueIsArray && !(hasBindingsKey in value)) {
        Object.defineProperty(value, hasBindingsKey, { value: true })

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

        marker.parentNode.insertBefore(fragment,
          getNextNode(i + 1, activeNodes) || marker)
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
          var a, b, currentNode

          value = x
          a = array[i]
          b = previousValues[i]

          if (a !== b) currentNode = replaceNode(a, b, i)

          if (currentNode)
            marker.parentNode.insertBefore(currentNode,
              getNextNode(i + 1, activeNodes) || marker)
        },
        enumerable: true
      })
    }

    function removeNode (value, previous, i) {
      var activeNode = activeNodes[i]
      var endPath = keyPath
      var returnValue

      // Cast previous value to null if undefined.
      var previousValue = previous === void 0 ? null : previous

      delete previousValues[i]

      if (activeNode) {
        if (valueIsArray) endPath = addToPath(path, keyPath, i)

        if (change)
          returnValue = change(activeNode, null, previousValue, endPath)
        else if (definition && mount) {
          findTarget(endPath, keyPath)
          returnValue = mount(activeNode, null, endPath)
        }

        // If a change or mount function returns the retain element symbol,
        // skip removing the element from the DOM.
        if (returnValue !== retainElementKey)
          marker.parentNode.removeChild(activeNode)

        delete activeNodes[i]
      }
    }

    // The return value of this function is a Node to be added, otherwise null.
    function replaceNode (value, previous, i) {
      var activeNode = activeNodes[i]
      var currentNode = node
      var endPath = keyPath
      var returnValue

      // Cast previous value to null if undefined.
      var previousValue = previous === void 0 ? null : previous

      // If value is undefined or null, just remove it.
      if (value == null) {
        removeNode(null, previousValue, i)
        return null
      }

      if (valueIsArray) endPath = addToPath(path, keyPath, i)

      previousValues[i] = value

      if (definition) {
        if (activeNode) removeNode(value, previousValue, i)
        currentNode = processNodes(scope, node.cloneNode(true), definition)
        endPath.target = valueIsArray ? value[i] : value
        bindKeys(scope, value, definition, currentNode, endPath)
        if (mount) {
          findTarget(endPath, keyPath)
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


    // ==========================================
    // Below are optimized array mutator methods.
    // They have to exist within this closure.
    // ==========================================

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
      var j, k, fragment, currentNode

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

        for (j = i + arguments.length; i < j; i++) defineIndex(this, i)

        marker.parentNode.insertBefore(fragment,
          getNextNode(arguments.length, activeNodes) || marker)
      }

      return value
    }

    function splice (start, count) {
      var insert = []
      var i, j, k, fragment, value, currentNode

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

        marker.parentNode.insertBefore(fragment,
          getNextNode(start + insert.length, activeNodes) || marker)
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


// Find next node.
function getNextNode (index, activeNodes) {
  var i, j, nextNode

  for (i = index, j = activeNodes.length; i < j; i++)
    if (activeNodes[i]) {
      nextNode = activeNodes[i]
      break
    }

  return nextNode
}


// Add index to the end of a path.
function addToPath (path, keyPath, i) {
  var endPath = keyPath.concat(i)

  endPath.root = path.root
  endPath.target = path.target

  return endPath
}


// Update the target.
function findTarget (endPath, keyPath) {
  var i, j

  endPath.target = endPath.root

  for (i = 0, j = keyPath.length - 1; i < j; j++)
    endPath.target = endPath.target[keyPath[i]]
}
