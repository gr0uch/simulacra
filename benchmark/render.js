'use strict'

var domino = require('domino')
var simulacra = require('../lib')

var cases = [ renderString, renderDOM, renderSimulacra ]
var iterations = 1000

console.log('number of iterations: ' + iterations)

cases.map(function (testCase) {
  var t0 = Date.now()
  var result, i

  for (i = 0; i < iterations; i++) testCase()
  result = Date.now() - t0
  console.log('test case "' + testCase.name + '" took: ' + result + ' ms')
  return result
})


function renderString () {
  var items = makeData().items
  var result = ''
  var i, j

  for (i = 0, j = items.length; i < j; i++)
    result += '<input value="' + items[i].name + '">'

  return result
}

function renderDOM () {
  var rawWindow = domino.createWindow()
  var document = rawWindow.document
  var body = document.body
  var items = makeData().items
  var i, j, element

  for (i = 0, j = items.length; i < j; i++) {
    element = document.createElement('input')
    element.value = items[i].name
    body.appendChild(element)
  }

  return body.innerHTML
}

function renderSimulacra () {
  var window = domino.createWindow('<input>')
  var state = makeData()
  var binding = [ 'body', {
    items: [ 'input', function (node, value) { if (value) return value.name } ]
  } ]

  return simulacra.call(window, state, binding).innerHTML
}

function makeData () {
  return {
    items: [ {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"} ]
  }
}
