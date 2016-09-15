'use strict'

var keyMap = require('./key_map')
var retainElement = keyMap.retainElement
var hasRAF = typeof requestAnimationFrame === 'function'


module.exports = {

  setDefault: function (node, value) {
    return value != null ? value : void 0
  },

  bindEvents: function (events, useCapture) {
    if (useCapture === void 0) useCapture = false

    return function (node, value, previousValue) {
      var key

      if (value == null)
        for (key in events)
          node.removeEventListener(key, events[key], useCapture)
      else if (previousValue == null)
        for (key in events)
          node.addEventListener(key, events[key], useCapture)
    }
  },

  animate: function (insertClass, mutateClass, removeClass, retainTime) {
    return function (node, value, previousValue) {
      if (!('classList' in node)) return void 0

      if (value == null) {
        if (insertClass) node.classList.remove(insertClass)
        if (removeClass) node.classList.add(removeClass)
        if (retainTime) {
          setTimeout(function () {
            node.parentNode.removeChild(node)
          }, retainTime)

          return retainElement
        }
      }
      else if (value != null && previousValue != null && mutateClass) {
        if (node.classList.contains(mutateClass)) {
          node.classList.remove(mutateClass)

          // Hack to trigger reflow.
          void node.offsetWidth
        }

        node.classList.add(mutateClass)
      }
      else if (previousValue == null && insertClass)
        // Hack to trigger class addition after it is inserted.
        if (hasRAF) requestAnimationFrame(function () {
          node.classList.add(insertClass)
        })
        else node.classList.add(insertClass)

      return void 0
    }
  },

  chain: function () {
    var args = arguments

    return function (node, value, previousValue, path) {
      var i, returnValue, result

      for (i = 0; i < args.length; i++) {
        returnValue = args[i](node, value, previousValue, path)
        if (returnValue !== void 0) result = returnValue
      }

      return result
    }
  }

}
