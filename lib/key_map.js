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
