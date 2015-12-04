'use strict'

var tapdance = require('tapdance')
var ok = tapdance.ok
var comment = tapdance.comment
var run = tapdance.run

var util = require('util')
var bind = require('../lib')

// ==========================

var template = document.createElement('template')
var fragment = template.content
var $ = function (s) { return fragment.querySelector(s) }
var data = {
  name: 'Coroham Coron',
  details: {
    size: 'Large',
    color: 'Brown'
  },
  prices: [
    { amount: 34.99, currency: 'usd' },
    { amount: 3800, currency: 'jpy' }
  ]
}

template.innerHTML = '<h1 class="name"></h1>' +
  '<ul class="details"><li class="size"></li><li class="color"></li></ul>' +
  '<h3 class="price"><span class="amount"></span>&nbsp;' +
  '<span class="currency"></span></h3>'

// ==========================


run(function () {
  var bindings = bind(fragment, {
    name: bind($('.name'), function (node, value) {
      node.textContent = value + '!'
    }),
    details: bind($('.details'), {
      size: bind($('.size')),
      color: bind($('.color'))
    }),
    prices: bind($('.price'), {
      amount: bind($('.amount')),
      currency: bind($('.currency'), function (node, value) {
        node.textContent = value.toUpperCase()
      })
    })
  })

  ok(bindings, 'definition works')

  document.body.appendChild(bind(data, bindings))
  ok(document.querySelector('h1'), 'bound node appended to DOM')
  ok(document.querySelector('.name').textContent === 'Coroham Coron!',
    'binding works')
  ok(document.querySelector('.size').textContent === 'Large',
    'nesting works')
  ok(document.querySelectorAll('.currency').length === 2,
    'iteration works')
})


run(function () {
  return fetch('http://localhost:8890', {
    method: 'post',
    body: JSON.stringify(window.__coverage__, null, 2)
  })
})
