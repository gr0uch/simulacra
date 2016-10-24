'use strict'

var runTest = require('tapdance')
var simulacra = require('../lib')


runTest(function (assert, comment) {
  var template, templateHTML, data, bindings, outlet

  comment('test string paths')

  template = document.createElement('template')
  templateHTML = '<h1 class="name"></h1>'
  template.innerHTML = templateHTML

  data = { name: 'Babby' }
  bindings = [ template, {
    name: '.name'
  } ]

  outlet = document.body
  outlet.appendChild(simulacra(data, bindings))

  assert(outlet.querySelector('.name').textContent === 'Babby',
    'binding works')
  assert(template.innerHTML === templateHTML,
    'original template unchanged')

  outlet.innerHTML = ''
})


runTest(function (assert, comment) {
  var template, data, bindings, outlet, inputText, inputCheckbox

  comment('test input change')

  template = document.createElement('template')
  template.innerHTML = '<input type="text"><input type="checkbox">'

  data = { input: 'x', checker: [ true, false ] }
  bindings = [ template, {
    input: '[type="text"]',
    checker: '[type="checkbox"]'
  } ]

  outlet = document.body
  outlet.appendChild(simulacra(data, bindings))
  inputText = outlet.querySelector('[type="text"]')
  inputCheckbox = outlet.querySelectorAll('[type="checkbox"]')

  assert(inputText.value === 'x', 'binding works')
  assert(inputCheckbox[0].checked === true, 'binding works')
  assert(inputCheckbox[1].checked === false, 'binding works')

  inputText.value = 'y'
  inputText.dispatchEvent(new Event('input'))
  inputCheckbox[0].checked = false
  inputCheckbox[0].dispatchEvent(new Event('input'))

  assert(data.input === 'y', 'changes propagated')
  assert(data.checker[0] === false, 'changes propagated')
  assert(data.checker[1] === false, 'value unchanged')

  outlet.innerHTML = ''
})


runTest(function (assert, comment) {
  var template, data, bindings, outlet, i = 0
  var isRebinding = false

  comment('test main use case')

  template = document.createElement('template')
  template.innerHTML = '<h1 class="name"></h1>' +
    '<ul class="details"><li class="size"></li><li class="color"></li></ul>' +
    '<h3 class="price"><span class="amount"></span>&nbsp;' +
    '<span class="currency"></span></h3>'

  data = {
    name: 'Coroham Coron',
    details: {
      size: 'Large',
      color: ['Brown', 'Pink']
    },
    prices: [
      { amount: 34.99, currency: 'usd' },
      { amount: 3800, currency: 'jpy' }
    ]
  }

  bindings = [ template, {
    name: [ '.name', function (node, value, previousValue, path) {
      assert(path.length === 1, 'path length is correct')
      if (!isRebinding) {
        isRebinding = true
        assert(path.root === data, 'root is correct')
        assert(path.target === data, 'target is correct')
      }
      assert(path[0] === 'name', 'path is correct')
      return value + '!'
    } ],
    details: [ '.details', {
      size: [ '.size', function (node, value, previousValue, path) {
        if (value !== 'Large') {
          if (i < 1) {
            i++
            throw new Error('BOOM!')
          }
          assert(path.length === 3, 'path length is correct')
          assert(path.root === data, 'root is correct')
          assert(path.target.size === 'XXL', 'target is correct')
          assert(path[0] === 'details', 'path value is correct')
          assert(path[1] === 0, 'path value is correct')
          assert(path[2] === 'size', 'path value is correct')
        }
        return value
      } ],
      color: [ '.color',
        function (node, value, previousValue, path) {
          assert(path.length === 3, 'path length is correct')
          assert(path.root === data, 'root is correct')
          assert(path.target === data.details, 'target is correct')
          assert(path[0] === 'details', 'path value is correct')
          assert(path[1] === 'color', 'path value is correct')
          assert(typeof path[2] === 'number', 'array path is a number')
        } ]
    } ],
    prices: [ '.price', {
      amount: '.amount',
      currency: [ '.currency', function (node, value) {
        return value.toUpperCase()
      } ]
    } ]
  } ]

  outlet = document.body
  outlet.appendChild(simulacra(data, bindings))

  assert(outlet.querySelector('h1'), 'bound node appended to DOM')
  assert(outlet.querySelector('.name').textContent === 'Coroham Coron!',
    'binding works')
  assert(outlet.querySelector('.size').textContent === 'Large',
    'nesting works')
  assert(outlet.querySelectorAll('.currency').length === 2,
    'iteration works')

  try {
    data.details.size = [ 'S', 'L' ]
    assert(null, 'should have failed')
  }
  catch (error) {
    assert(error.message === 'BOOM!', 'error message is correct')
    assert(data.details.size === 'Large', 'value has not changed')
  }

  data.details = [ { size: 'XXL' } ]
  assert(outlet.querySelector('.size').textContent === 'XXL',
    'continues to work after error')

  comment('test rebinding')
  outlet.innerHTML = ''
  outlet.appendChild(simulacra({
    name: 'babby'
  }, bindings))
  assert(outlet.textContent === 'babby!', 'rebinding works')

  outlet.innerHTML = ''
})


runTest(function () {
  return fetch('http://localhost:8890', {
    method: 'post',
    body: JSON.stringify(window['__coverage__'], null, 2)
  })
})
