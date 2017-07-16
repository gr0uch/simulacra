'use strict'

// This is a templating benchmark taken from Marko.js.
// https://github.com/marko-js/templating-benchmarks/blob/master/templates/search-results/

var fs = require('fs')
var path = require('path')
var domino = require('domino')
var simulacra = require('../lib')
var render = require('../lib/render')
var data = require('./search-results.json')

var templatePath = path.join(__dirname, 'search-results.html')
var template = fs.readFileSync(templatePath).toString('utf8')
var iterations = 1000
var binding = makeBinding()
var i, j, record, t0, result, window

// Massage the data to be 1:1 with the template.
for (i = 0, j = data.searchRecords.length; i < j; i++) {
  record = data.searchRecords[i]
  record.title = {
    href: record.viewItemUrl,
    text: record.title
  }

  if ('sizes' in record && record.sizes.length)
    record.sizes = {
      size: record.sizes
    }

  if (!record.featured) delete record.featured
}

data.view = {
  type: data.view,
  searchRecords: data.searchRecords
}

delete data.searchRecords


t0 = Date.now()

for (i = 0; i < iterations; i++)
  result = renderString(data)

// console.log(result)

report('String Rendering', Date.now() - t0)


// Perform one warm-up iteration.
render({}, binding, template)

t0 = Date.now()

for (i = 0; i < iterations; i++)
  result = render(data, binding)

// console.log(result)

report('DOM Subset', Date.now() - t0)

t0 = Date.now()

for (i = 0; i < iterations; i++) {
  window = domino.createWindow(template)
  result = simulacra.call(window, clone(data), makeBinding()).innerHTML
}

// console.log(result)

report('Full DOM', Date.now() - t0)

function makeBinding () {
  return [ 'body', {
    totalCount: $('totalCount'),
    view: [ $('view'), {
      type: function (node, value) {
        node.classList.add('view-' + value)
      },
      searchRecords: [ $('searchRecords'), {
        imgUrl: [ $('imgUrl'), function (node, value) {
          node.src = value
        } ],
        title: [ $('title'), {
          href: function (node, value) {
            node.href = value
          },
          text: function (node, value) {
            node.textContent = value
          }
        } ],
        description: $('description'),
        featured: [ $('featured'), noop ],
        sizes: [ $('sizes'), {
          size: $('size')
        } ]
      } ]
    } ]
  } ]
}

function $ (selector) {
  return '[data-bind="' + selector + '"]'
}

function noop () {}

function report (title, diff) {
  console.log(title)
  console.log('Performed ' + iterations + ' iterations in ' + diff + ' ms')
  console.log('Time per iteration: ' + (diff / iterations) + ' ms')
  console.log('Operations per second: ' + Math.floor(1000 / (diff / iterations)))
  console.log('')
}

function clone (obj) {
  var key, value, result = Array.isArray(obj) ? [] : {}

  for (key in obj)
    if (typeof obj[key] === 'object') result[key] = clone(obj[key])
    else result[key] = obj[key]

  return result
}

function renderString (data) {
  var _, __, i, j, k, l, parts = []
  parts.push('<div class="search-results-container"><div class="searching" id="searching"><div class="wait-indicator-icon"></div>Searching...</div><div id="resultsContainer"><div class="hd"><span class="count">')
  parts.push(data.totalCount)
  parts.push(' results</span><div class="view-modifiers"><div class="view-select">View:<div class="view-icon view-icon-selected" id="viewIconGallery"><i class="icon-th"/></div><div class="view-icon" id="viewIconList"><i class="icon-th-list"/></div></div></div></div><div id="resultsTarget"><div class="search-results view-')
  parts.push(data.view.type)
  for (i = 0, j = data.view.searchRecords.length; i < j; i++) {
    _ = data.view.searchRecords[i]
    parts.push('<div class="search-item"><div class="search-item-container drop-shadow"><div class="img-container"><img src="')
    parts.push(_.imgUrl)
    parts.push('"></div><h4 class="title"><a href="')
    parts.push(_.title.href)
    parts.push('">')
    parts.push(_.title.text)
    parts.push('</a></h4><span>')
    parts.push(_.description)
    parts.push('</span>')
    if (_.featured)
      parts.push('<div>Featured!</div>')
    if (_.sizes) {
      parts.push('<div>Sizes available<ul>')
      for (k = 0, l = _.sizes.size.length; k < l; k++) {
        __ = _.sizes.size[k]
        parts.push('<li>')
        parts.push(__)
        parts.push('</li>')
      }
      parts.push('</ul></div>')
    }
    parts.push('</div></div>')
  }
  parts.push('</div></div></div></div>')
  return parts.join('')
}
