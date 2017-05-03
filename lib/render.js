'use strict'

var htmlParser = require('htmlparser2')
var select = require('css-select')
var serialize = require('dom-serializer')

// These symbols are not re-usable.
var renderFnKey = Symbol('renderFn')
var insertionPathKey = Symbol('insertionPath')
var insertionOrderKey = Symbol('insertionOrder')
var matchedNodeKey = Symbol('matchedNode')
var hasDefinitionKey = Symbol('hasDefinition')
var parentBindingsKey = Symbol('parentBindings')

var handlerOptions = { withDomLvl1: true }

// Entities are a performance killer! However, this is potentially unsafe.
var serializeOptions = { decodeEntities: false }

var escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;'
}

var elementExtension = {
  addEventListener: { value: noop },
  removeEventListener: { value: noop },
  setAttribute: { value: function (key, value) {
    this.attribs[key] = value
  } },
  innerHTML: {
    get: function () {
      return this.children[0].data
    },
    set: function (html) {
      this.children = [ { data: html } ]
      return html
    },
    configurable: true
  },
  classList: {
    get: function () {
      var self = this

      return {
        add: function (cls) {
          if (!('class' in self.attribs)) self.attribs['class'] = cls
          else self.attribs['class'] += ' ' + cls
        },
        remove: function (cls) {
          self.attribs['class'] = self.attribs['class'].replace(cls, '')
        }
      }
    },
    configurable: true
  }
}

var attributeAliases = {
  checked: 'checked',
  className: 'class',
  placeholder: 'placeholder',
  value: 'value',
  required: 'required',
  disabled: 'disabled'
}

var booleanAttributes = [
  'checked', 'required', 'disabled'
]

var key

for (key in attributeAliases)
  (function (attribute, isBoolean) {
    elementExtension[key] = {
      get: function () {
        return this.attribs[attribute]
      },
      set: function (value) {
        if (isBoolean && !value) delete this.attribs[attribute]
        else this.attribs[attribute] = value
        return value
      },
      configurable: true
    }
  }(attributeAliases[key], ~booleanAttributes.indexOf(key)))


module.exports = render


/**
 * Internal function for rendering strings. The benchmark to beat is plain old
 * string concatenation and for loops. Although this won't be faster, it should
 * work with more or less the same functionality as the DOM version.
 *
 * Only a tiny subset of the actual DOM is implemented here, so it may not work
 * for all front-end functionality.
 *
 * @param {Object} obj
 * @param {Object} def
 * @param {String} [html]
 * @return {String}
 */
function render (obj, def, html) {
  var i, nodes, handler, parser, element

  // Generating the render function is processing intensive. Skip if possible.
  if (renderFnKey in def) return def[renderFnKey](obj)

  // Callback API looks weird. This is actually synchronous, not asynchronous.
  handler = new htmlParser.DomHandler(function (error, result) {
    if (error) throw error
    nodes = result
  }, handlerOptions)

  parser = new htmlParser.Parser(handler)
  parser.write(html)
  parser.end()

  for (i = nodes.length; i--;)
    if (nodes[i].type === 'tag') {
      element = nodes[i]
      break
    }

  if (!element) throw new Error('No element found!')

  Object.defineProperties(Object.getPrototypeOf(element), elementExtension)

  processDefinition(def, nodes)
  def[renderFnKey] = makeRender(def, nodes)

  return def[renderFnKey](obj)
}


function processDefinition (def, nodes) {
  var insertionIndices = []
  var i, key, branch, selector, matches, match

  for (key in def) {
    branch = def[key]

    if (typeof branch === 'function') {
      if (!(parentBindingsKey in def)) def[parentBindingsKey] = []
      def[parentBindingsKey].push(key)
      continue
    }

    if (!Array.isArray(branch)) def[key] = branch = [ branch ]
    selector = branch[0]

    if (typeof selector !== 'string') throw new Error('Selector on "' +
      key + '" must be a string.')

    matches = select(selector, nodes)

    if (!matches.length) throw new Error('Matching node not found on "' +
      key + '".')

    match = matches[0]
    locateMatch(branch, nodes, match, [])
    insertionIndices.push(branch[insertionPathKey][0])
    branch[matchedNodeKey] = match
    removeMatches(nodes, matches)

    if (typeof branch[1] === 'object') {
      branch[hasDefinitionKey] = true
      processDefinition(branch[1], match.children)
    }
  }

  def[insertionOrderKey] = Object.keys(def)
    .filter(function (key) {
      return insertionPathKey in def[key]
    })
    .sort(function (a, b) {
      return def[a][insertionPathKey][0] - def[b][insertionPathKey][0]
    })

  // Optimization: serialize static nodes in advance.
  for (i = nodes.length; i--;)
    if (!~insertionIndices.indexOf(i))
      nodes[i] = { data: serialize(nodes[i], serializeOptions) }
}


function locateMatch (branch, nodes, match, path) {
  var i, j, node

  for (i = 0, j = nodes.length; i < j; i++) {
    node = nodes[i]

    if (match === node) {
      path.push(i)
      branch[insertionPathKey] = path
      return true
    }

    if (node.children.length) {
      path.push(i)
      if (!locateMatch(branch, node.children, match, path)) path.pop()
    }
  }

  return false
}


function removeMatches (nodes, matches) {
  var i, node

  for (i = nodes.length; i--;) {
    node = nodes[i]
    if (~matches.indexOf(node)) {
      nodes.splice(i, 1)
      continue
    }
    if (node.children.length)
      removeMatches(node.children, matches)
  }
}


function makeRender (def, nodes) {
  return function (obj) {
    return serialize(fillTemplate(obj, def, nodes, obj), serializeOptions)
  }
}


function fillTemplate (obj, def, nodes, root) {
  var clonedNodes = []
  var path = {
    root: root,
    target: obj
  }
  var key, value, branch, node, change, returnValue, isArray
  var nestedDef, parentKey
  var i, j, k, l

  for (i = 0, j = nodes.length; i < j; i++)
    clonedNodes.push(cloneNode(nodes[i]))

  for (i = def[insertionOrderKey].length; i--;) {
    key = def[insertionOrderKey][i]
    path.key = key

    value = obj[key]
    if (value === null || value === void 0) continue

    isArray = Array.isArray(value)
    if (!isArray) value = [ value ]

    branch = def[key]

    for (j = value.length; j--;) {
      node = cloneNode(branch[matchedNodeKey])

      if (hasDefinitionKey in branch) {
        nestedDef = branch[1]
        if (parentBindingsKey in nestedDef)
          for (k = 0, l = nestedDef[parentBindingsKey].length; k < l; k++) {
            parentKey = nestedDef[parentBindingsKey][k]
            path.key = parentKey
            nestedDef[parentKey](node, value[j][parentKey], null, path)
          }

        node.children = fillTemplate(value[j], nestedDef, node.children, root)
        change = branch[2]
      }
      else change = branch[1]

      // Apply change function.
      if (change) {
        if (isArray) path.index = j
        else delete path.index
        returnValue = change(node, value[j], null, path)
      }
      else returnValue = value[j]

      if (!(hasDefinitionKey in branch) && returnValue !== void 0)
        if (node.name === 'input' ||
          node.name === 'textarea' ||
          node.name === 'progress')
          if (node.attribs.type === 'checkbox' ||
            node.attribs.type === 'radio') {
            if (returnValue) node.attribs.checked = true
          }
          else node.attribs.value = htmlEscape(returnValue)
        else node.children = [ { data: htmlEscape(returnValue) } ]

      insertNode(node, clonedNodes, branch[insertionPathKey])
    }
  }

  return clonedNodes
}


function insertNode (node, nodes, path) {
  var i, j, currentNodes = nodes

  for (i = 0, j = path.length - 1; i < j; i++)
    currentNodes = nodes[i].children

  currentNodes.splice(path[j], 0, node)
}


function cloneNode (node) {
  var i, j, key, clonedNode

  if ('data' in node) return node

  clonedNode = Object.create(Object.getPrototypeOf(node))
  clonedNode.type = node.type
  clonedNode.name = node.name
  clonedNode.children = []
  clonedNode.attribs = {}

  if ('children' in node)
    for (i = 0, j = node.children.length; i < j; i++)
      clonedNode.children.push(cloneNode(node.children[i]))

  for (key in node.attribs)
    clonedNode.attribs[key] = node.attribs[key]

  return clonedNode
}


function htmlEscape (html) {
  return html.replace(/[&<>"']/g, replacer)
}


function replacer (char) {
  return escapeMap[char]
}


function noop () {}
