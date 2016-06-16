'use strict'

var keys = [
  'hasBindings',
  'hasDefinition',
  'isBoundToParent',
  'isDeferred',
  'marker',
  'replaceAttribute',
  'retainElement'
]

var keyMap = {}
var hasSymbol = typeof Symbol === 'function'
var i, j

for (i = 0, j = keys.length; i < j; i++)
  keyMap[keys[i]] = hasSymbol ?
    Symbol(keys[i]) : '__' + keys[i] + '__'

module.exports = keyMap
