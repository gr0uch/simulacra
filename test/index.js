'use strict'

var tapdance = require('tapdance')
var comment = tapdance.comment
var ok = tapdance.ok
var run = tapdance.run

var $ = require('../lib')


run(function () {
  var template, data, bindings, result

  comment('test string paths')

  template = document.createElement('div')
  template.innerHTML = '<h1 class="name"></h1>'
  document.body.appendChild(template)

  data = { name: 'Babby' }
  bindings = [ 'div', {
    name: '.name'
  } ]

  result = document.body.appendChild($(data, bindings))

  ok(result.querySelector('.name').textContent === 'Babby',
    'binding works')
  ok(!template.querySelector('.name').textContent,
    'original template unchanged')
})


run(function () {
  var template, fragment, selector, data, bindings, outlet, i = 0

  comment('test main use case')

  template = document.createElement('template')
  template.innerHTML = '<h1 class="name"></h1>' +
    '<ul class="details"><li class="size"></li><li class="color"></li></ul>' +
    '<h3 class="price"><span class="amount"></span>&nbsp;' +
    '<span class="currency"></span></h3>'

  fragment = template.content
  selector = function (s) { return fragment.querySelector(s) }

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

  bindings = [ fragment, {
    name: [ '.name', function (node, value, previousValue, path) {
      ok(path.length === 1, 'path length is correct')
      ok(path.root === data, 'root is correct')
      ok(path.target === data, 'target is correct')
      ok(path[0] === 'name', 'path is correct')
      node.textContent = value + '!'
    } ],
    details: [ selector('.details'), {
      size: [ '.size', function (node, value, previousValue, path) {
        if (value !== 'Large') {
          if (i < 1) {
            i++
            throw new Error('BOOM!')
          }
          ok(path.length === 3, 'path length is correct')
          ok(path.root === data, 'root is correct')
          ok(path.target === data.details[0], 'target is correct')
          ok(path[0] === 'details', 'path value is correct')
          ok(path[1] === 0, 'path value is correct')
          ok(path[2] === 'size', 'path value is correct')
        }
        node.textContent = value
      } ],
      color: [ selector('.color'),
        function (node, value, previousValue, path) {
          ok(path.length === 3, 'path length is correct')
          ok(path.root === data, 'root is correct')
          ok(path.target === data.details, 'target is correct')
          ok(path[0] === 'details', 'path value is correct')
          ok(path[1] === 'color', 'path value is correct')
          ok(typeof path[2] === 'number', 'array path is a number')
        } ]
    } ],
    prices: [ selector('.price'), {
      amount: selector('.amount'),
      currency: [ selector('.currency'), function (node, value) {
        node.textContent = value.toUpperCase()
      } ]
    } ]
  } ]

  outlet = document.createElement('div')
  outlet.id = 'outlet'
  document.body.appendChild(outlet)
  outlet.appendChild($(data, bindings))

  ok(outlet.querySelector('h1'), 'bound node appended to DOM')
  ok(outlet.querySelector('.name').textContent === 'Coroham Coron!',
    'binding works')
  ok(outlet.querySelector('.size').textContent === 'Large',
    'nesting works')
  ok(outlet.querySelectorAll('.currency').length === 2,
    'iteration works')

  try {
    data.details.size = [ 'S', 'L' ]
    ok(null, 'should have failed')
  }
  catch (error) {
    ok(error.message === 'BOOM!', 'error message is correct')
    ok(data.details.size[0] === 'S' && data.details.size[1] === 'L',
      'value has changed')
  }

  data.details = [ { size: 'XXL' } ]
  ok(outlet.querySelector('.size').textContent === 'XXL',
    'continues to work after error')
})


run(function () {
  return fetch('http://localhost:8890', {
    method: 'post',
    body: JSON.stringify(window.__coverage__, null, 2)
  })
})
