'use strict'

var keyMap = require('./key_map')
var retainElement = keyMap.retainElement


module.exports = {

  setDefault: function (node, value) {
    return value
  },

  bindEvents: function (events, useCapture) {
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

  animate: function (addClass, changeClass, removeClass, retainTime) {
    return function (node, value, previousValue) {
      if (value == null) {
        if (addClass) node.classList.remove(addClass)
        if (removeClass) node.classList.add(removeClass)
        if (retainTime) {
          setTimeout(function () {
            node.parentNode.removeChild(node)
          }, retainTime)

          return retainElement
        }
      }
      else if (value != null && previousValue != null && changeClass) {
        if (node.classList.contains(changeClass)) {
          node.classList.remove(changeClass)

          // Hack to trigger reflow.
          void node.offsetWidth
        }

        node.classList.add(changeClass)
      }
      else if (previousValue == null && addClass) {
        // Hack to trigger reflow.
        void node.offsetWidth

        node.classList.add(addClass)
      }
    }
  },

  chain: function () {
    return function (node, value, previousValue, path) {
      var i, returnValue

      for (i = 0; i < arguments.length; i++)
        returnValue = arguments[i](node, value, previousValue, path)

      return returnValue
    }
  }

}
