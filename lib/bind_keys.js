'use strict'

var processNodes = require('./process_nodes')
var keyMap = require('./key_map')

var markerMap = processNodes.markerMap
var hasDefinitionKey = keyMap.hasDefinition
var isBoundToParentKey = keyMap.isBoundToParent
var replaceAttributeKey = keyMap.replaceAttribute
var retainElementKey = keyMap.retainElement

// This is a global store that keeps the previously assigned values of keys
// on objects. It is keyed by the bound object and valued by a memoized object
// that contains the same keys.
var storeMemo = new WeakMap()

// Internal meta-information about objects.
var storeMeta = new WeakMap()


module.exports = bindKeys


/**
 * Define getters & setters. This function is the internal entry point to a lot
 * of functionality.
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
  var i, j, meta, keys, key, keyPath

  if (typeof obj !== 'object' || obj === null)
    throw new TypeError(
      'Invalid type of value "' + obj + '", object expected.')

  storeMemo.set(obj, {})

  meta = {}
  storeMeta.set(obj, meta)

  keys = Object.keys(def)
  for (i = 0, j = keys.length; i < j; i++) {
    key = keys[i]

    keyPath = path.concat(key)
    keyPath.root = path.root
    keyPath.target = obj

    meta[key] = {
      keyPath: keyPath,
      activeNodes: [],
      previousValues: [],
      valueIsArray: null
    }

    bindKey(scope, obj, def, key, parentNode, path)
  }
}


// This is an internal function, the arguments aren't pretty.
function bindKey (scope, obj, def, key, parentNode, path) {
  var document = scope ? scope.document : window.document
  var memo = storeMemo.get(obj)
  var meta = storeMeta.get(obj)[key]
  var branch = def[key]
  var node = branch[0]
  var change = !branch[hasDefinitionKey] && branch[1]
  var definition = branch[hasDefinitionKey] && branch[1]
  var mount = branch[2]
  var marker = markerMap.get(branch)

  // Temporary keys.
  var keyPath = meta.keyPath
  var activeNodes = meta.activeNodes
  var previousValues = meta.previousValues
  var valueIsArray = meta.valueIsArray

  // For initialization, call this once.
  setter(obj[key])

  Object.defineProperty(obj, key, {
    get: getter,
    set: setter,
    enumerable: true,
    configurable: true
  })

  function getter () { return memo[key] }

  function setter (x) {
    var fragment, value, previousValue, currentNode
    var a, b, i, j

    // Special case for binding same node as parent.
    if (branch[isBoundToParentKey]) {
      previousValue = memo[key]
      memo[key] = x

      // Check for no-op.
      if (x === previousValue) return null

      // Need to qualify this check for non-empty value.
      if (definition && x != null)
        bindKeys(scope, x, definition, parentNode, keyPath)

      else if (change) change(parentNode, x, previousValue, keyPath)

      return null
    }

    memo[key] = x
    valueIsArray = Array.isArray(x)
    value = valueIsArray ? x : [ x ]

    // Assign custom mutator methods on the array instance.
    if (valueIsArray) {
      // Some mutators such as `sort`, `reverse`, `fill`, `copyWithin` are
      // not present here. That is because they trigger the array index
      // setter functions by assigning on them internally.

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
      enumerable: true,
      configurable: true
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
        returnValue = mount(activeNode, null, previousValue, endPath)
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
      currentNode = processNodes(scope, node, definition)
      endPath.target = valueIsArray ? value[i] : value
      bindKeys(scope, value, definition, currentNode, endPath)
      if (mount) {
        findTarget(endPath, keyPath)
        mount(currentNode, value, null, endPath)
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


  // Below are optimized array mutator methods. They have to exist within
  // this closure. Note that the native implementations of these methods do
  // not trigger setter functions on array indices.

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

    for (i = 2, j = arguments.length; i < j; i++)
      insert.push(arguments[i])

    // Passing arguments to apply is fine.
    Array.prototype.splice.apply(previousValues, arguments)

    // In this case, avoid setting new values.
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
