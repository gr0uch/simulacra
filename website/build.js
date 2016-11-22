'use strict'

const fs = require('fs-extra')
const path = require('path')
const domino = require('domino')
const simulacra = require('../lib')
const marked = require('marked')
const mkdirp = require('mkdirp')
const postcss = require('postcss')
const atImport = require('postcss-import')
const cssnext = require('postcss-cssnext')
const cssnano = require('cssnano')
const hjs = require('highlight.js')
const pkg = require('../package.json')
const minifier = require('html-minifier')

const minify = minifier.minify
const start = Date.now()
const outputPath = path.join(__dirname, '../dist')
const CNAME = 'simulacra.js.org'


// Render the page
// ===============

const head = fs.readFileSync(
  path.join(__dirname, 'head.html')).toString()
const body = fs.readFileSync(
  path.join(__dirname, 'body.html')).toString()
const exampleHTML = fs.readFileSync(
  path.join(__dirname, 'example.html')).toString()
const helperHTML = fs.readFileSync(
  path.join(__dirname, 'helper.html')).toString()
const readme = fs.readFileSync(
  path.join(__dirname, '../README.md')).toString()

const renderer = new marked.Renderer()
const tableMethod = renderer.table

renderer.table = function () {
  return '<div class="table-wrapper">' +
    tableMethod.apply(null, arguments) + '</div>'
}

renderer.heading = (text, level) => {
  const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-')
  return `<h${level} id="${escapedText}">${text}<a class="anchor" ` +
    `href="#${escapedText}" title="Link to this section “${text}”">#</a>` +
    `</h${level}>`
}

const text = (/(##(?:[\s\S]+)(?=))/g).exec(readme)[1]
let content = marked(text, {
  renderer, highlight: (code, lang) => hjs.highlight(lang, code).value
})
const window = domino.createWindow(content)
const document = window.document

const exampleNode = document.createElement('div')
exampleNode.innerHTML = exampleHTML
const helperNode = document.createElement('div')
helperNode.innerHTML = helperHTML

const exampleMarker = document.querySelectorAll('h2')[1].nextSibling
exampleMarker.parentNode.insertBefore(exampleNode, exampleMarker)
const helperMarker = document.querySelectorAll('h2')[3].nextSibling
helperMarker.parentNode.insertBefore(helperNode, helperMarker)

content = document.body.innerHTML

function $ () {
  return simulacra.apply(domino.createWindow(body), arguments)
}

const t0 = Date.now()
const documentBody = $({
  content,
  version: `#v${pkg.version}`,
  name: pkg.name,
  description: pkg.description,
}, [ 'body', {
  name: [ 'header h1', (node, value) => {
    node.innerHTML = [
      '<span>',
      value.charAt(0).toUpperCase(),
      value.slice(1),
      '</span>.js'
    ].join('')
  } ],
  description: 'header h2',
  version: '.version',
  content: [ 'article', (node, value) => { node.innerHTML = value } ]
} ]).innerHTML
console.info(`HTML rendered in ${Date.now() - t0} ms.`)

mkdirp.sync(outputPath)
fs.writeFileSync(path.join(outputPath, 'index.html'), minify(
  [ head, documentBody ].join(''),
  { collapseWhitespace: true }
))


// Build the CSS
// =============

const cssIndex = path.join(__dirname, 'index.css')

postcss([ atImport, cssnext, cssnano() ])
.process(fs.readFileSync(cssIndex).toString(), { from: cssIndex })
.then(result =>
  fs.writeFileSync(path.join(outputPath, 'index.css'), result.css))


// Write CNAME file
// ================

fs.writeFileSync(path.join(outputPath, 'CNAME'), CNAME)


// Copy benchmarks folder
// ======================

fs.copySync(
  path.join(__dirname, '../benchmark/dbmonster'),
  path.join(outputPath, 'dbmonster'),
  { clobber: true })


// Done!
// =====

console.info(`Build completed in ${Date.now() - start} ms.`)
