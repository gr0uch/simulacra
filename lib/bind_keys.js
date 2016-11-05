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

// Internal meta-information about objects. Keyed by bound object and valued by
// meta-information object.
var storeMeta = new WeakMap()

// Element tag names for elements that should update data on change.
var updateTags = [ 'INPUT', 'TEXTAREA' ]


module.exports = bindKeys

// Expose internals, for rehydration purposes.
bindKeys.storeMeta = storeMeta
bindKeys.addToPath = addToPath
bindKeys.findTarget = findTarget


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
  var meta, key, keyPath

  if (typeof obj !== 'object' || obj === null)
    throw new TypeError(
      'Invalid type of value "' + obj + '", object expected.')

  storeMemo.set(obj, {})

  meta = {}
  storeMeta.set(obj, meta)

  for (key in def) {
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

  // Temporary keys.
  var keyPath = meta.keyPath
  var activeNodes = meta.activeNodes
  var previousValues = meta.previousValues
  var valueIsArray = meta.valueIsArray

  // For initialization, call this once.
  if (branch[isBoundToParentKey]) parentSetter(obj[key])
  else setter(obj[key])

  Object.defineProperty(obj, key, {
    get: getter,
    set: branch[isBoundToParentKey] ? parentSetter : setter,
    enumerable: true,
    configurable: true
  })

  function getter () { return memo[key] }

  // Special case for binding same node as parent.
  function parentSetter (x) {
    var previousValue = memo[key]
    var returnValue

    // Check for no-op.
    if (x === previousValue) return x

    // Need to qualify this check for non-empty value.
    if (definition && x != null)
      bindKeys(scope, x, definition, parentNode, keyPath)

    else if (change) {
      returnValue = change(parentNode, x, previousValue, keyPath)
      if (returnValue !== void 0)
        changeValue(parentNode, returnValue, branch[replaceAttributeKey])
    }

    // If nothing went wrong, set the memoized value.
    memo[key] = x

    return x
  }

  function setter (x) {
    var marker = markerMap.get(branch)
    var fragment, value, currentNode
    var a, b, i, j

    valueIsArray = meta.valueIsArray = Array.isArray(x)
    value = valueIsArray ? x : [ x ]

    // Handle rendering to the DOM. This algorithm tries to batch insertions
    // into as few document fragments as possible.
    for (i = 0, j = Math.max(previousValues.length, value.length);
      i < j; i++) {
      a = value[i]
      b = previousValues[i]
      currentNode = !a || a !== b ? replaceNode(a, b, i) : null

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

    // Assign array mutator methods.
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

    // If nothing went wrong, set the memoized value.
    memo[key] = x

    return x
  }

  function defineIndex (array, i) {
    var value = array[i]

    Object.defineProperty(array, i, {
      get: function () { return value },
      set: function (x) {
        var marker = markerMap.get(branch)
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

  function removeNode (value, previousValue, i) {
    var marker = markerMap.get(branch)
    var activeNode = activeNodes[i]
    var endPath = keyPath
    var returnValue

    delete previousValues[i]

    if (activeNode) {
      delete activeNodes[i]

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
    }
  }

  // The return value of this function is a Node to be added, otherwise null.
  function replaceNode (value, previousValue, i) {
    var activeNode = activeNodes[i]
    var currentNode = node
    var endPath = keyPath
    var returnValue

    // Cast values to null if undefined.
    if (value === void 0) value = null
    if (previousValue === void 0) previousValue = null

    // If value is null, just remove it.
    if (value === null) {
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

      if (change) {
        returnValue = change(currentNode, value, previousValue, endPath)
        if (returnValue !== void 0)
          changeValue(currentNode, returnValue, branch[replaceAttributeKey])
      }
      else {
        // Add default update behavior. Note that this event does not get
        // removed, since it is assumed that it will be garbage collected.
        if (previousValue === null && ~updateTags.indexOf(currentNode.tagName))
          currentNode.addEventListener('input',
            updateChange(branch[replaceAttributeKey], endPath, key))

        changeValue(currentNode, value, branch[replaceAttributeKey])
      }

      // Do not actually add an element to the DOM if it's only a change
      // between non-empty values.
      if (activeNode) return null
    }

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
    var marker = markerMap.get(branch)
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
    var marker = markerMap.get(branch)
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
    var marker = markerMap.get(branch)
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
    node.checked = Boolean(value)
    break
  case 'value':
    // Prevent some misbehavior in certain browsers when setting a value to
    // itself, i.e. text caret not in the correct position.
    if (node.value !== value) node.value = value
    break
  default:
    node[attribute] = value
  }
}


// Find next node in a potentially sparse array.
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
  endPath.target = path.target || path.root

  return endPath
}


// Find and set the new target, when dealing with nested objects.
function findTarget (endPath, keyPath) {
  var i, j

  endPath.target = endPath.root

  for (i = 0, j = keyPath.length - 1; i < j; j++)
    endPath.target = endPath.target[keyPath[i]]
}


// Internal event listener to update data on input change.
function updateChange (targetKey, path, key) {
  var target = path.target
  var lastKey = path[path.length - 1]
  var replaceKey = key

  if (typeof lastKey === 'number') {
    target = target[key]
    replaceKey = lastKey
  }

  return function handleChange (event) {
    target[replaceKey] = event.target[targetKey]
  }
}
