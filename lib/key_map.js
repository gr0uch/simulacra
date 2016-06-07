'use strict'

var keys = [
  'hasBindings',
  'hasDefinition',
  'hasMutators',
  'isBoundToParent',
  'marker',
  'replaceAttribute'
]

var keyMap = {}
var i, j

for (i = 0, j = keys.length; i < j; i++)
  keyMap[keys[i]] = '__' + keys[i] + '__'

module.exports = keyMap
