'use strict'

var run = require('tapdance')
var render = require('../lib/render')


run(function (assert, comment) {
  var binding = { text: 'div' }
  var template = '<div></div>'

  comment('re-use binding')
  assert(render({}, binding, template) === '',
    'works first time')
  assert(render({ text: 'foo' }, binding) === '<div>foo</div>',
    'works without template')
})


run(function (assert, comment) {
  var state = {
    name: 'Pumpkin Spice Latte',
    details: {
      meta: 'extra',
      size: [ 'Tall', 'Grande', 'Venti' ],
      vendor: 'Coffee Co.'
    }
  }

  var indices = 0
  var nestedChange = 0
  var parentBinding = 0
  var result

  var binding = {
    name: '.name',
    details: [ '.details', {
      meta: function (node, value, previousValue, path) {
        assert(path.key === 'meta', 'key is set')
        node.classList.add(value)
        parentBinding++
      },
      size: [ '.size', function (node, value, previousValue, path) {
        indices += path.index
        node.innerHTML = value
      } ],
      vendor: [ '.vendor', function (node, value) { return value } ]
    }, function (node) {
      nestedChange++
      node.addEventListener()
      node.removeEventListener()
      assert(true, 'dom methods stubbed')
    } ]
  }

  var template = [
    '<h1 class="name"></h1>',
    '<div class="details">',
    '<div><span class="size"></span></div>',
    '<hr><h4 class="vendor"></h4>',
    '</div>'
  ].join('')

  var expectedResult = [
    '<h1 class="name">Pumpkin Spice Latte</h1>',
    '<div class="details extra"><div>',
    '<span class="size">Tall</span>',
    '<span class="size">Grande</span>',
    '<span class="size">Venti</span>',
    '</div><hr><h4 class="vendor">Coffee Co.</h4></div>'
  ].join('')

  comment('string rendering')
  result = render(state, binding, template)
  assert(result === expectedResult, 'it works')
  assert(indices === 3, 'index checksum correct')
  assert(nestedChange === 1, 'nested change called once')
  assert(parentBinding === 1, 'parent binding called once')
})


run(function (assert, comment) {
  var bind = {
    checkbox: { isEnabled: 'input' },
    value: { text: 'textarea' },
    text: { text: 'div' }
  }
  var template = {
    checkbox: '<input type="checkbox">',
    value: '<textarea></textarea>',
    text: '<div></div>'
  }
  var output = {}

  comment('checked binding')
  output.on = render({ isEnabled: true }, bind.checkbox, template.checkbox)
  output.off = render({ isEnabled: false }, bind.checkbox, template.checkbox)
  assert(output.on === '<input type="checkbox" checked="true">', 'checked')
  assert(output.off === '<input type="checkbox">', 'not checked')

  comment('value binding')
  output.value = render({ text: '<foo>' }, bind.value, template.value)
  assert(output.value === '<textarea>&lt;foo&gt;</textarea>', 'value set')

  comment('text binding')
  output.text = render({ text: 'foo' }, bind.text, template.text)
  assert(output.text === '<div>foo</div>', 'text set')
})
