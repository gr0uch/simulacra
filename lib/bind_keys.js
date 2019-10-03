'use strict'

var processNodes = require('./process_nodes')
var keyMap = require('./key_map')

var markerKey = keyMap.marker
var metaKey = keyMap.meta
var isMarkerLastKey = keyMap.isMarkerLast
var hasDefinitionKey = keyMap.hasDefinition
var isBoundToParentKey = keyMap.isBoundToParent
var replaceAttributeKey = keyMap.replaceAttribute
var retainElementKey = keyMap.retainElement
var memoizedObjectKey = keyMap.memoizedObject

// Fixed constant for text node type.
var TEXT_NODE = 3

// Element tag names for elements that should update data on change.
var updateTags = [ 'INPUT', 'TEXTAREA' ]


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
  var meta, key

  if (typeof obj !== 'object' || obj === null)
    throw new TypeError(
      'Invalid type of value "' + obj + '", object expected.')

  Object.defineProperty(obj, memoizedObjectKey, {
    value: {},
    configurable: true
  })

  Object.defineProperty(obj, metaKey, {
    value: {},
    configurable: true
  })

  meta = obj[metaKey]

  for (key in def) {
    meta[key] = {
      keyPath: {
        key: key,
        root: path.root,
        target: obj
      },
      activeNodes: [],
      previousValues: [],

      // Assign the current marker relevant to this object. This is in case of
      // arrays of objects.
      currentMarker: def[key][markerKey],

      valueIsArray: null
    }

    bindKey(scope, obj, def, key, parentNode)
  }
}


// This is an internal function that's used for defining the getters and
// setters.
function bindKey (scope, obj, def, key, parentNode) {
  var branch = def[key]
  var parentSetter, setter

  // For initialization, call this once.
  if (branch[isBoundToParentKey]) {
    parentSetter = createParentSetter(scope, obj, def, key, parentNode)
    parentSetter(obj[key])
  }
  else {
    setter = createSetter(scope, obj, def, key)
    setter(obj[key])
  }

  Object.defineProperty(obj, key, {
    get: createGetter(obj, key),
    set: branch[isBoundToParentKey] ? parentSetter : setter,
    enumerable: true,
    configurable: true
  })
}


function createGetter (obj, key) {
  var memoizedObject = obj[memoizedObjectKey]
  return function getter () { return memoizedObject[key] }
}


function createParentSetter (scope, obj, def, key, parentNode) {
  var memoizedObject = obj[memoizedObjectKey]
  var branch = def[key]
  var change = !branch[hasDefinitionKey] && branch[1]
  var definition = branch[hasDefinitionKey] && branch[1]
  var meta = obj[metaKey][key]
  var keyPath = meta.keyPath

  // Special case for binding same node as parent.
  return function parentSetter (x) {
    var previousValue = memoizedObject[key]
    var returnValue

    // Optimistically set the memoized value, so it persists even if an error
    // occurs after this point.
    memoizedObject[key] = x

    // Check for no-op.
    if (x === previousValue) return x

    // Need to qualify this check for non-empty value.
    if (definition && x !== null && x !== void 0)
      bindKeys(scope, x, definition, parentNode, keyPath)

    else if (change) {
      returnValue = change(parentNode, x,
        previousValue === void 0 ? null : previousValue, keyPath)
      if (returnValue !== void 0)
        changeValue(parentNode, returnValue, branch[replaceAttributeKey])
    }

    return x
  }
}


function createSetter (scope, obj, def, key) {
  var memoizedObject = obj[memoizedObjectKey]
  var meta = obj[metaKey][key]
  var valueIsArray = meta.valueIsArray
  var previousValues = meta.previousValues
  var branch = def[key]
  var isMarkerLast = branch[isMarkerLastKey]
  var activeNodes = meta.activeNodes

  return function setter (x) {
    var value, marker, currentNode
    var a, b, i, j

    // Optimistically set the memoized value, so it persists even if an error
    // occurs after this point.
    memoizedObject[key] = x

    valueIsArray = meta.valueIsArray = Array.isArray(x)
    value = valueIsArray ? x : [ x ]

    for (i = 0, j = Math.max(previousValues.length, value.length);
      i < j; i++) {
      a = value[i]
      b = previousValues[i]
      currentNode = !a || a !== b ?
        replaceNode(scope, obj, def, key, a, b, i) : null
      marker = meta.currentMarker

      if (currentNode)
        if (isMarkerLast) {
          marker.parentNode.appendChild(currentNode)
          marker.parentNode.appendChild(marker)
        }
        else marker.parentNode.insertBefore(currentNode,
          getNextNode(i + 1, activeNodes) || marker)
    }

    // Reset length to current values, implicitly deleting indices and
    // allowing for garbage collection.
    if (value.length !== previousValues.length)
      previousValues.length = activeNodes.length = value.length

    // Assign array mutator methods if we get an array.
    if (valueIsArray) {
      // Some mutators such as `sort`, `reverse`, `fill`, `copyWithin` are
      // not present here. That is because they trigger the array index
      // setter functions by assigning on them internally.

      // These mutators may alter length.
      value.pop = patchPop(obj, def, key)
      value.push = patchPush(scope, obj, def, key)
      value.shift = patchShift(obj, def, key)
      value.unshift = patchUnshift(scope, obj, def, key)
      value.splice = patchSplice(scope, obj, def, key)

      // Handle array index assignment.
      for (i = 0, j = value.length; i < j; i++)
        defineIndex(scope, obj, def, key, value, i)
    }

    return x
  }
}


// Used for assigning object properties on the indices of arrays passed in.
function defineIndex (scope, obj, def, key, array, i) {
  var meta = obj[metaKey][key]
  var activeNodes = meta.activeNodes
  var previousValues = meta.previousValues
  var branch = def[key]
  var isMarkerLast = branch[isMarkerLastKey]
  var value = array[i]

  Object.defineProperty(array, i, {
    get: function () { return value },
    set: function (x) {
      var a, b, marker, currentNode

      value = x
      a = array[i]
      b = previousValues[i]

      if (a !== b) currentNode = replaceNode(scope, obj, def, key, a, b, i)
      marker = meta.currentMarker

      if (currentNode)
        if (isMarkerLast) {
          marker.parentNode.appendChild(currentNode)
          marker.parentNode.appendChild(marker)
        }
        else marker.parentNode.insertBefore(
          currentNode, getNextNode(i + 1, activeNodes) || marker)
    },
    enumerable: true,
    configurable: true
  })
}


// Internal function to remove a node.
function removeNode (obj, def, key, value, previousValue, i) {
  var meta = obj[metaKey][key]
  var activeNodes = meta.activeNodes
  var previousValues = meta.previousValues
  var valueIsArray = meta.valueIsArray
  var keyPath = meta.keyPath
  var marker = meta.currentMarker
  var branch = def[key]
  var change = !branch[hasDefinitionKey] && branch[1]
  var definition = branch[hasDefinitionKey] && branch[1]
  var mount = branch[2]

  var activeNode = activeNodes[i]
  var returnValue

  delete previousValues[i]

  if (activeNode) {
    delete activeNodes[i]

    if (valueIsArray) keyPath.index = i
    else delete keyPath.index

    if (change)
      returnValue = change(activeNode, null, previousValue, keyPath)
    else if (definition && mount) {
      keyPath.target = previousValue
      returnValue = mount(activeNode, null, previousValue, keyPath)
    }

    // If a change or mount function returns the retain element symbol,
    // skip removing the element from the DOM.
    if (returnValue !== retainElementKey)
      marker.parentNode.removeChild(activeNode)
  }
}


// The return value of this function is a Node to be added, otherwise null.
function replaceNode (scope, obj, def, key, value, previousValue, i) {
  var meta = obj[metaKey][key]
  var branch = def[key]
  var change = !branch[hasDefinitionKey] && branch[1]
  var definition = branch[hasDefinitionKey] && branch[1]
  var node = branch[0]
  var mount = branch[2]
  var activeNodes = meta.activeNodes
  var previousValues = meta.previousValues
  var valueIsArray = meta.valueIsArray
  var keyPath = meta.keyPath
  var activeNode = activeNodes[i]
  var currentNode = node
  var returnValue

  // Cast values to null if undefined.
  if (value === void 0) value = null
  if (previousValue === void 0) previousValue = null

  // If value is null, just remove the Node.
  if (value === null) {
    removeNode(obj, def, key, null, previousValue, i)
    return null
  }

  if (valueIsArray) keyPath.index = i
  else delete keyPath.index

  previousValues[i] = value

  if (definition) {
    if (activeNode) removeNode(obj, def, key, value, previousValue, i)
    currentNode = processNodes(scope, node, definition)
    keyPath.target = valueIsArray ? value[i] : value
    bindKeys(scope, value, definition, currentNode, keyPath)
    if (mount) {
      keyPath.target = value
      mount(currentNode, value, null, keyPath)
    }
  }

  else {
    currentNode = activeNode || node.cloneNode(true)

    if (change) {
      returnValue = change(currentNode, value, previousValue, keyPath)
      if (returnValue !== void 0)
        changeValue(currentNode, returnValue, branch[replaceAttributeKey])
    }
    else {
      // Add default update behavior. Note that this event does not get
      // removed, since it is assumed that it will be garbage collected.
      if (previousValue === null &&
          ~updateTags.indexOf(currentNode.tagName))
        currentNode.addEventListener(
          'input', updateChange(branch[replaceAttributeKey], keyPath, key))

      changeValue(currentNode, value, branch[replaceAttributeKey])
    }

    // Do not actually add an element to the DOM if it's only a change
    // between non-empty values.
    if (activeNode) return null
  }

  activeNodes[i] = currentNode

  return currentNode
}


// Default behavior when a return value is given for a change function.
function changeValue (node, value, attribute) {
  var firstChild

  switch (attribute) {
  case 'textContent':
    firstChild = node.firstChild
    if (firstChild && !firstChild.nextSibling &&
      firstChild.nodeType === TEXT_NODE)
      firstChild.textContent = value
    else node.textContent = value
    break
  case 'checked':
    node.checked = Boolean(value)
    break
  case 'value':
    // Prevent some misbehavior in certain browsers when setting a value to
    // itself, i.e. text caret not in the correct position.
    if (node.value !== value) node.value = value
    break
  default:
    break
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


// Internal event listener to update data on input change.
function updateChange (targetKey, path, key) {
  var target = path.target
  var index = path.index
  var replaceKey = key

  if (typeof index === 'number') {
    target = target[key]
    replaceKey = index
  }

  return function handleChange (event) {
    target[replaceKey] = event.target[targetKey]
  }
}

// INTERNAL ARRAY MUTATOR METHODS
// ==============================
// Note that the native implementations of these methods do not trigger setter
// functions on array indices.

function patchPop (obj, def, key) {
  var meta = obj[metaKey][key]
  var activeNodes = meta.activeNodes
  var previousValues = meta.previousValues

  return function pop () {
    var i = this.length - 1
    var previousValue = previousValues[i]
    var value = Array.prototype.pop.call(this)

    removeNode(obj, def, key, null, previousValue, i)
    previousValues.length = activeNodes.length = this.length

    return value
  }
}

function patchPush (scope, obj, def, key) {
  var meta = obj[metaKey][key]
  var branch = def[key]
  var isMarkerLast = branch[isMarkerLastKey]

  return function push () {
    var i = this.length
    var j = i + arguments.length
    var marker, currentNode

    // Passing arguments to apply is fine.
    var value = Array.prototype.push.apply(this, arguments)

    for (j = i + arguments.length; i < j; i++) {
      currentNode = replaceNode(scope, obj, def, key, this[i], null, i)
      marker = meta.currentMarker
      if (currentNode)
        if (isMarkerLast) {
          marker.parentNode.appendChild(currentNode)
          marker.parentNode.appendChild(marker)
        }
        else marker.parentNode.insertBefore(currentNode, marker)
      defineIndex(scope, obj, def, key, this, i)
    }

    return value
  }
}

function patchShift (obj, def, key) {
  var meta = obj[metaKey][key]
  var activeNodes = meta.activeNodes
  var previousValues = meta.previousValues

  return function shift () {
    removeNode(obj, def, key, null, previousValues[0], 0)

    Array.prototype.shift.call(previousValues)
    Array.prototype.shift.call(activeNodes)

    return Array.prototype.shift.call(this)
  }
}

function patchUnshift (scope, obj, def, key) {
  return function unshift () {
    var i, j

    for (i = this.length, j = i + arguments.length; i < j; i++)
      defineIndex(scope, obj, def, key, this, i)

    return Array.prototype.unshift.apply(this, arguments)
  }
}

function patchSplice (scope, obj, def, key) {
  var meta = obj[metaKey][key]
  var activeNodes = meta.activeNodes
  var previousValues = meta.previousValues
  var branch = def[key]
  var isMarkerLast = branch[isMarkerLastKey]

  return function splice (start, count) {
    var insert = []
    var i, j, k, value, marker, currentNode, shouldAppend

    for (i = start, j = start + count; i < j; i++)
      removeNode(obj, def, key, null, previousValues[i], i)

    for (i = 2, j = arguments.length; i < j; i++)
      insert.push(arguments[i])

    // Passing arguments to apply is fine.
    Array.prototype.splice.apply(previousValues, arguments)

    // In this case, avoid setting new values.
    Array.prototype.splice.apply(activeNodes,
      [ start, count ].concat(Array(insert.length)))

    value = Array.prototype.splice.apply(this, arguments)
    shouldAppend = start - count >= this.length - 1

    for (i = start, j = start + insert.length; i < j; i++) {
      currentNode =
        replaceNode(scope, obj, def, key, insert[i - start], null, i)
      marker = meta.currentMarker
      if (currentNode)
        if (isMarkerLast && shouldAppend) {
          marker.parentNode.appendChild(currentNode)
          marker.parentNode.appendChild(marker)
        }
        else marker.parentNode.insertBefore(currentNode,
          getNextNode(start + insert.length, activeNodes) || marker)
    }

    k = insert.length - count

    if (k < 0)
      previousValues.length = activeNodes.length = this.length

    else if (k > 0)
      for (i = this.length - k, j = this.length; i < j; i++)
        defineIndex(scope, obj, def, key, this, i)

    return value
  }
}
