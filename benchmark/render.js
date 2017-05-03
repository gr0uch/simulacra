'use strict'

var domino = require('domino')
var simulacra = require('../lib')
var render = require('../lib/render')

var cases = [ renderString, renderSimulacra, renderDOM, renderSimulacraDOM ]
var iterations = 1000

var sharedBinding = {
  items: [ 'input', function (node, value) { node.value = value.name } ]
}

console.log('number of iterations: ' + iterations)

cases.map(function (testCase) {
  var t0 = Date.now()
  var result, i

  // Do one warm-up iteration.
  testCase()

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
  var window = domino.createWindow()
  var document = window.document
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

function renderSimulacraDOM () {
  var window = domino.createWindow('<input>')
  var state = makeData()
  var binding = [ 'body', {
    items: [ 'input', function (node, value) { return value.name } ]
  } ]

  return simulacra.call(window, state, binding).innerHTML
}

function renderSimulacra () {
  return render(makeData(), sharedBinding, '<input>')
}

function makeData () {
  return {
    items: [ {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"} ]
  }
}
