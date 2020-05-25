/*!
 * Simulacra.js
 * Version 2.2.0
 * MIT License
 * http://simulacra.js.org/
 */
(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{"./key_map":5,"./process_nodes":6}],2:[function(require,module,exports){
'use strict'

module.exports = featureCheck

/**
 * Check if capabilities are available, or throw an error.
 *
 * @param {*} globalScope
 */
function featureCheck (globalScope, features) {
  var i, j, k, l, feature, path

  for (i = 0, j = features.length; i < j; i++) {
    path = features[i]

    if (typeof path[0] === 'string') {
      feature = globalScope

      for (k = 0, l = path.length; k < l; k++) {
        if (!(path[k] in feature)) throw new Error('Missing ' +
          path.slice(0, k + 1).join('.') + ' feature which is required.')

        feature = feature[path[k]]
      }
    }

    else {
      feature = path[0]

      for (k = 1, l = path.length; k < l; k++) {
        if (k > 1) feature = feature[path[k]]

        if (typeof feature === 'undefined') throw new Error('Missing ' +
          path[0].name + path.slice(1, k + 1).join('.') +
          ' feature which is required.')
      }
    }
  }
}

},{}],3:[function(require,module,exports){
'use strict'

var keyMap = require('./key_map')
var retainElement = keyMap.retainElement
var hasMutationObserver = typeof MutationObserver !== 'undefined'
var hasDocument = typeof document !== 'undefined'


module.exports = {
  bindEvents: bindEvents,
  animate: animate
}


function makeEventListener (fn, path) {
  return function eventListener (event) {
    return fn(event, path)
  }
}


function ignoreEvent (event) {
  event.stopPropagation()
  event.preventDefault()
}


function bindEvents (events, useCapture) {
  var listeners = {}

  if (useCapture === void 0) useCapture = false

  return function (node, value, previousValue, path) {
    var key

    if (value === null)
      for (key in events) {
        // The point of removing event listeners here is not manual memory
        // management, but to ensure that after the value has been unset, it
        // no longer triggers events.
        node.removeEventListener(key, listeners[key], useCapture)

        // Add a capturing event listener to make future events effectively
        // ignored.
        node.addEventListener(key, ignoreEvent, true)
      }
    else if (previousValue === null)
      for (key in events) {
        listeners[key] = makeEventListener(events[key], path)
        node.addEventListener(key, listeners[key], useCapture)
      }
  }
}


function animate (insertClass, mutateClass, removeClass, retainTime) {
  return function (node, value, previousValue) {
    var observer

    if (!('classList' in node)) return void 0

    if (value === null) {
      if (insertClass) node.classList.remove(insertClass)
      if (removeClass) node.classList.add(removeClass)
      if (retainTime) {
        setTimeout(function () {
          node.parentNode.removeChild(node)
        }, retainTime)

        return retainElement
      }
    }
    else if (value !== null && previousValue !== null && mutateClass) {
      if (node.classList.contains(mutateClass)) {
        node.classList.remove(mutateClass)

        // Hack to trigger reflow.
        void node.offsetWidth
      }

      node.classList.add(mutateClass)
    }
    else if (previousValue === null && insertClass)
      // Trigger class addition after the element is inserted.
      if (hasMutationObserver && hasDocument &&
        !document.documentElement.contains(node)) {
        observer = new MutationObserver(function (mutations) {
          var i, j, k, l, mutation

          for (i = 0, j = mutations.length; i < j; i++) {
            mutation = mutations[i]

            for (k = 0, l = mutation.addedNodes.length; k < l; k++)
              if (mutation.addedNodes[k] === node) {
                // Hack to trigger reflow.
                void node.offsetWidth

                node.classList.add(insertClass)
                observer.disconnect()
              }
          }
        })

        observer.observe(document.documentElement, {
          childList: true, subtree: true
        })
      }
      else node.classList.add(insertClass)

    return void 0
  }
}

},{"./key_map":5}],4:[function(require,module,exports){
'use strict'

var processNodes = require('./process_nodes')
var bindKeys = require('./bind_keys')
var keyMap = require('./key_map')
var helpers = require('./helpers')
var rehydrate = require('./rehydrate')
var featureCheck = require('./feature_check')

var helper
var isArray = Array.isArray
var hasDefinitionKey = keyMap.hasDefinition
var replaceAttributeKey = keyMap.replaceAttribute
var isBoundToParentKey = keyMap.isBoundToParent
var isProcessedKey = keyMap.isProcessed
var markerKey = keyMap.marker

// Element tag names which should have value replaced.
var replaceValue = [ 'INPUT', 'PROGRESS' ]

// Input types which use the "checked" attribute.
var replaceChecked = [ 'checkbox', 'radio' ]

// A list of features to check for upon instantiation.
var features = [
  // ECMAScript features.
  [ Object, 'defineProperty' ],

  // DOM features. Missing `contains` since apparently it is not on
  // the Node.prototype in Internet Explorer.
  [ 'document', 'createTreeWalker' ],
  [ 'Node', 'prototype', 'cloneNode' ],
  [ 'Node', 'prototype', 'normalize' ],
  [ 'Node', 'prototype', 'insertBefore' ],
  [ 'Node', 'prototype', 'isEqualNode' ],
  [ 'Node', 'prototype', 'removeChild' ]
]

// Symbol for retaining an element instead of removing it.
Object.defineProperty(simulacra, 'retainElement', {
  enumerable: true, value: keyMap.retainElement
})

// Option to use comment nodes as markers.
Object.defineProperty(simulacra, 'useCommentNode', {
  get: function () { return processNodes.useCommentNode },
  set: function (value) { processNodes.useCommentNode = value },
  enumerable: true
})

// Assign helpers on the main export.
for (helper in helpers) simulacra[helper] = helpers[helper]


module.exports = simulacra


/**
 * Bind an object to the DOM.
 *
 * @param {Object} obj
 * @param {Object} def
 * @param {Node} [matchNode]
 * @return {Node}
 */
function simulacra (obj, def, matchNode) {
  var document = this ? this.document : window.document
  var Node = this ? this.Node : window.Node
  var node, query

  // Before continuing, check if required features are present.
  featureCheck(this || window, features)

  if (obj === null || typeof obj !== 'object' || isArray(obj))
    throw new TypeError('First argument must be a singular object.')

  if (!isArray(def))
    throw new TypeError('Second argument must be an array.')

  if (typeof def[0] === 'string') {
    query = def[0]
    def[0] = document.querySelector(query)
    if (!def[0]) throw new Error(
      'Top-level Node "' + query + '" could not be found in the document.')
  }
  else if (!(def[0] instanceof Node)) throw new TypeError(
    'The first position of the top-level must be either a Node or a CSS ' +
    'selector string.')

  if (!def[isProcessedKey]) {
    // Auto-detect template tag.
    if ('content' in def[0]) def[0] = def[0].content

    def[0] = def[0].cloneNode(true)
    cleanNode(this, def[0])
    ensureNodes(def[0], def[1])
    setProperties(def)
  }

  node = processNodes(this, def[0], def[1])

  bindKeys(this, obj, def[1], node, { root: obj })

  if (matchNode) {
    rehydrate(this, obj, def[1], node, matchNode)
    return matchNode
  }

  return node
}


/**
 * Internal function to mutate string selectors into Nodes and validate that
 * they are allowed.
 *
 * @param {Element} parentNode
 * @param {Object} def
 */
function ensureNodes (parentNode, def) {
  var adjacentNodes = []
  var i, j, key, query, branch, boundNode, matchedNodes
  var adjacentNode, adjacentKey

  if (typeof def !== 'object') throw new TypeError(
    'The second position must be an object.')

  for (key in def) {
    branch = def[key]

    // Change function or definition object bound to parent.
    if (typeof branch === 'function' || (typeof branch === 'object' &&
      branch !== null && !Array.isArray(branch)))
      def[key] = branch = [ parentNode, branch ]

    // Cast CSS selector string to array.
    else if (typeof branch === 'string') def[key] = branch = [ branch ]

    else if (!Array.isArray(branch))
      throw new TypeError('The binding on key "' + key + '" is invalid.')

    // Dereference CSS selector string to actual DOM element.
    if (typeof branch[0] === 'string') {
      query = branch[0]

      // Match all nodes for the selector, pick the first and remove the rest.
      matchedNodes = parentNode.querySelectorAll(query)

      if (!matchedNodes.length) throw new Error(
        'An element for selector "' + query + '" was not found.')

      for (i = 1, j = matchedNodes.length; i < j; i++)
        matchedNodes[i].parentNode.removeChild(matchedNodes[i])

      branch[0] = matchedNodes[0]
    }
    else if (!branch[0])
      throw new TypeError(
        'The first position on key "' + key +
        '" must be a CSS selector string.')

    // Auto-detect template tag.
    if ('content' in branch[0]) branch[0] = branch[0].content

    boundNode = branch[0]

    if (typeof branch[1] === 'object' && branch[1] !== null) {
      Object.defineProperty(branch, hasDefinitionKey, { value: true })
      if (branch[2] && typeof branch[2] !== 'function')
        throw new TypeError('The third position on key "' + key +
          '" must be a function.')
    }
    else if (branch[1] && typeof branch[1] !== 'function')
      throw new TypeError('The second position on key "' + key +
        '" must be an object or a function.')

    // Special case for binding to parent node.
    if (parentNode === boundNode) {
      Object.defineProperty(branch, isBoundToParentKey, { value: true })
      if (branch[hasDefinitionKey]) ensureNodes(boundNode, branch[1])
      else if (typeof branch[1] === 'function')
        setReplaceAttribute(branch, boundNode)
      else console.warn( // eslint-disable-line
        'A change function was not defined on the key "' + key + '".')
      setProperties(branch)
      continue
    }

    adjacentNodes.push([ key, boundNode ])

    if (!parentNode.contains(boundNode))
      throw new Error('The bound DOM element must be either ' +
        'contained in or equal to the element in its parent binding.')

    if (branch[hasDefinitionKey]) {
      ensureNodes(boundNode, branch[1])
      setProperties(branch)
      continue
    }

    setReplaceAttribute(branch, boundNode)
    setProperties(branch)
  }

  // Need to loop again to invalidate containment in adjacent nodes, after the
  // adjacent nodes are found.
  for (key in def) {
    boundNode = def[key][0]
    for (i = 0, j = adjacentNodes.length; i < j; i++) {
      adjacentKey = adjacentNodes[i][0]
      adjacentNode = adjacentNodes[i][1]

      if (adjacentNode.contains(boundNode) && adjacentKey !== key)
        throw new Error(
          'The element for key "' + key + '" is contained in the ' +
          'element for the adjacent key "' + adjacentKey + '".')
    }
  }

  setProperties(def)
}


// Internal function to strip empty text nodes.
function cleanNode (scope, node) {
  // A constant for showing text nodes.
  var showText = 0x00000004
  var document = scope ? scope.document : window.document
  var treeWalker = document.createTreeWalker(
    node, showText, processNodes.acceptNode, false)
  var textNode

  while (treeWalker.nextNode()) {
    textNode = treeWalker.currentNode
    textNode.textContent = textNode.textContent.trim()
  }

  node.normalize()
}


function setReplaceAttribute (branch, boundNode) {
  Object.defineProperty(branch, replaceAttributeKey, {
    value: ~replaceValue.indexOf(boundNode.nodeName) ?
      ~replaceChecked.indexOf(boundNode.type) ?
        'checked' : 'value' : 'textContent'
  })
}


function setProperties (obj) {
  Object.defineProperty(obj, isProcessedKey, { value: true })
  Object.defineProperty(obj, markerKey, { value: null, writable: true })
}

},{"./bind_keys":1,"./feature_check":2,"./helpers":3,"./key_map":5,"./process_nodes":6,"./rehydrate":7}],5:[function(require,module,exports){
'use strict'

var keys = [
  // Internal flag when a definition is used instead of a change function.
  'hasDefinition',

  // Internal flag that is set when a change function is bound to its
  // parent object.
  'isBoundToParent',

  // Boolean flag to check whether a Node has already been processed.
  'isProcessed',

  // This boolean flag is used for a DOM performance optimization,
  // `appendChild` is faster than `insertBefore`.
  'isMarkerLast',

  // A marker is a superfluous node (empty text or comment) used as a reference
  // position for the DOM API.
  'marker',

  // Generic key for storing meta information.
  'meta',

  // This keeps the previously assigned values of keys on objects. It is set on
  // a bound object and valued by a memoized object that contains the same
  // keys as the bound object.
  'memoizedObject',

  // Internally used to match cloned nodes.
  'matchedNode',

  // Internally used to indicate what attribute to set.
  'replaceAttribute',

  // This is a publicly exposed symbol used for indicating that an element
  // should be retained in the DOM tree after its value is unset.
  'retainElement',

  // Used for mapping a DOM Node to its preprocessed template.
  'template'
]

var keyMap = {}
var hasSymbol = typeof Symbol === 'function'
var i, j

for (i = 0, j = keys.length; i < j; i++)
  keyMap[keys[i]] = hasSymbol ?
    Symbol(keys[i]) : '__' + keys[i] + '__'

module.exports = keyMap

},{}],6:[function(require,module,exports){
'use strict'

var keyMap = require('./key_map')

var isBoundToParentKey = keyMap.isBoundToParent
var markerKey = keyMap.marker
var matchedNodeKey = keyMap.matchedNode
var templateKey = keyMap.template
var isMarkerLastKey = keyMap.isMarkerLast

// A fixed constant for `NodeFilter.SHOW_ALL`.
var showAll = 0xFFFFFFFF

// Option to use comment nodes as markers.
processNodes.useCommentNode = false

// Avoiding duplication of compatibility hack.
processNodes.acceptNode = acceptNode

module.exports = processNodes


/**
 * Internal function to remove bound nodes and replace them with markers.
 *
 * @param {*} [scope]
 * @param {Node} node
 * @param {Object} def
 * @return {Node}
 */
function processNodes (scope, node, def) {
  var document = scope ? scope.document : window.document
  var key, branch, result, mirrorNode, parent, marker, indices
  var i, j, treeWalker, orderedKeys

  result = def[templateKey]

  if (!result) {
    node = node.cloneNode(true)

    indices = []

    matchNodes(scope, node, def)

    orderedKeys = Object.keys(def).sort(function (a, b) {
      var nodeA = def[a][0][matchedNodeKey]
      var nodeB = def[b][0][matchedNodeKey]

      if (nodeA && nodeB)
        return nodeA.index - nodeB.index

      return 0
    })

    for (i = 0; i < orderedKeys.length; i++) {
      key = orderedKeys[i]
      branch = def[key]
      if (branch[isBoundToParentKey]) continue

      result = branch[0][matchedNodeKey]
      indices.push(result.index)
      mirrorNode = result.node
      parent = mirrorNode.parentNode

      // This value is memoized so that `appendChild` can be used instead of
      // `insertBefore`, which is a performance optimization.
      if (mirrorNode.nextElementSibling === null)
        branch[isMarkerLastKey] = true

      if (processNodes.useCommentNode) {
        marker = parent.insertBefore(
          document.createComment(' end "' + key + '" '), mirrorNode)
        parent.insertBefore(
          document.createComment(' begin "' + key + '" '), marker)
      }
      else marker = parent.insertBefore(
        document.createTextNode(''), mirrorNode)

      branch[markerKey] = marker

      parent.removeChild(mirrorNode)
    }

    Object.defineProperty(def, templateKey, {
      value: {
        node: node.cloneNode(true),
        indices: indices
      }
    })
  }
  else {
    node = result.node.cloneNode(true)
    indices = result.indices
    i = 0
    j = 0

    treeWalker = document.createTreeWalker(
      node, showAll, acceptNode, false)

    for (key in def) {
      branch = def[key]
      if (branch[isBoundToParentKey]) continue

      while (treeWalker.nextNode()) {
        if (i === indices[j]) {
          branch[markerKey] = treeWalker.currentNode
          i++
          break
        }
        i++
      }

      j++
    }
  }

  return node
}


/**
 * Internal function to find and set matching DOM nodes on cloned nodes.
 *
 * @param {*} [scope]
 * @param {Node} node
 * @param {Object} def
 */
function matchNodes (scope, node, def) {
  var document = scope ? scope.document : window.document
  var treeWalker = document.createTreeWalker(
    node, showAll, acceptNode, false)
  var nodes = []
  var i, j, key, currentNode, childWalker
  var nodeIndex = 0

  // This offset is a bit tricky, it's used to determine the index of the
  // marker in the processed node, which depends on whether comment nodes
  // are used and the count of child nodes.
  var offset = processNodes.useCommentNode ? 1 : 0

  for (key in def) nodes.push(def[key][0])

  while (treeWalker.nextNode() && nodes.length) {
    for (i = 0, j = nodes.length; i < j; i++) {
      currentNode = nodes[i]
      if (treeWalker.currentNode.isEqualNode(currentNode)) {
        Object.defineProperty(currentNode, matchedNodeKey, {
          value: {
            index: nodeIndex + offset,
            node: treeWalker.currentNode
          }
        })
        if (processNodes.useCommentNode) offset++
        childWalker = document.createTreeWalker(
          currentNode, showAll, acceptNode, false)
        while (childWalker.nextNode()) offset--
        nodes.splice(i, 1)
        break
      }
    }

    nodeIndex++
  }
}


// A crazy Internet Explorer workaround.
function acceptNode () { return 1 }
acceptNode.acceptNode = acceptNode

},{"./key_map":5}],7:[function(require,module,exports){
'use strict'

var processNodes = require('./process_nodes')
var bindKeys = require('./bind_keys')
var keyMap = require('./key_map')

var hasDefinitionKey = keyMap.hasDefinition
var isBoundToParentKey = keyMap.isBoundToParent
var markerKey = keyMap.marker
var metaKey = keyMap.meta
var acceptNode = processNodes.acceptNode

// A fixed constant for `NodeFilter.SHOW_ELEMENT`.
var whatToShow = 0x00000001

// Fixed constant for comment node type.
var COMMENT_NODE = 8

module.exports = rehydrate


/**
 * Rehydration of existing DOM nodes by recursively checking equality.
 *
 * @param {*} scope
 * @param {Object} obj
 * @param {Object} def
 * @param {Node} node
 * @param {Node} matchNode
 */
function rehydrate (scope, obj, def, node, matchNode) {
  var document = scope ? scope.document : window.document

  var key, branch, x, value, change, definition, mount, keyPath
  var meta, valueIsArray, activeNodes, index, treeWalker, currentNode

  for (key in def) {
    branch = def[key]
    meta = obj[metaKey][key]
    change = !branch[hasDefinitionKey] && branch[1]
    definition = branch[hasDefinitionKey] && branch[1]
    mount = branch[2]
    keyPath = meta.keyPath

    if (branch[isBoundToParentKey]) {
      x = obj[key]

      if (definition && x !== null && x !== void 0)
        bindKeys(scope, x, definition, matchNode, keyPath)
      else if (change)
        change(matchNode, x, null, keyPath)

      continue
    }

    activeNodes = meta.activeNodes
    if (!activeNodes.length) continue

    valueIsArray = meta.valueIsArray
    x = valueIsArray ? obj[key] : [ obj[key] ]
    index = 0
    treeWalker = document.createTreeWalker(
      matchNode, whatToShow, acceptNode, false)

    while (index < activeNodes.length && treeWalker.nextNode()) {
      currentNode = activeNodes[index]

      if (treeWalker.currentNode.isEqualNode(currentNode)) {
        activeNodes.splice(index, 1, treeWalker.currentNode)

        value = x[index]

        if (valueIsArray) keyPath.index = index
        else delete keyPath.index

        if (definition) {
          rehydrate(scope, value, definition,
            currentNode, treeWalker.currentNode)

          if (mount) {
            keyPath.target = value
            mount(treeWalker.currentNode, value, null, keyPath)
          }
        }
        else if (change)
          change(treeWalker.currentNode, value, null, keyPath)

        index++
      }
    }

    if (index !== activeNodes.length) throw new Error(
      'Matching nodes could not be found on key "' + key + '", expected ' +
      activeNodes.length + ', found ' + index + '.')

    // Rehydrate marker node.
    currentNode = treeWalker.currentNode

    // Try to re-use comment node.
    if (processNodes.useCommentNode &&
      currentNode.nextSibling !== null &&
      currentNode.nextSibling.nodeType === COMMENT_NODE)
      branch[markerKey] = currentNode.nextSibling
    else branch[markerKey] = currentNode.parentNode.insertBefore(
      document.createTextNode(''), currentNode.nextSibling)
  }
}

},{"./bind_keys":1,"./key_map":5,"./process_nodes":6}],8:[function(require,module,exports){
window.simulacra = require('../lib/index')

},{"../lib/index":4}]},{},[8]);
