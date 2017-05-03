'use strict'

var keyMap = require('./key_map')
var retainElement = keyMap.retainElement
var hasMutationObserver = typeof MutationObserver !== 'undefined'
var hasDocument = typeof document !== 'undefined'


module.exports = {
  bindEvents: bindEvents,
  animate: animate
}


function makeEventListener (fn, path) {
  return function eventListener (event) {
    return fn(event, path)
  }
}


function ignoreEvent (event) {
  event.stopPropagation()
  event.preventDefault()
}


function bindEvents (events, useCapture) {
  var listeners = {}

  if (useCapture === void 0) useCapture = false

  return function (node, value, previousValue, path) {
    var key

    if (value === null)
      for (key in events) {
        // The point of removing event listeners here is not manual memory
        // management, but to ensure that after the value has been unset, it
        // no longer triggers events.
        node.removeEventListener(key, listeners[key], useCapture)

        // Add a capturing event listener to make future events effectively
        // ignored.
        node.addEventListener(key, ignoreEvent, true)
      }
    else if (previousValue === null)
      for (key in events) {
        listeners[key] = makeEventListener(events[key], path)
        node.addEventListener(key, listeners[key], useCapture)
      }
  }
}


function animate (insertClass, mutateClass, removeClass, retainTime) {
  return function (node, value, previousValue) {
    var observer

    if (!('classList' in node)) return void 0

    if (value === null) {
      if (insertClass) node.classList.remove(insertClass)
      if (removeClass) node.classList.add(removeClass)
      if (retainTime) {
        setTimeout(function () {
          node.parentNode.removeChild(node)
        }, retainTime)

        return retainElement
      }
    }
    else if (value !== null && previousValue !== null && mutateClass) {
      if (node.classList.contains(mutateClass)) {
        node.classList.remove(mutateClass)

        // Hack to trigger reflow.
        void node.offsetWidth
      }

      node.classList.add(mutateClass)
    }
    else if (previousValue === null && insertClass)
      // Trigger class addition after the element is inserted.
      if (hasMutationObserver && hasDocument &&
        !document.documentElement.contains(node)) {
        observer = new MutationObserver(function (mutations) {
          var i, j, k, l, mutation

          for (i = 0, j = mutations.length; i < j; i++) {
            mutation = mutations[i]

            for (k = 0, l = mutation.addedNodes.length; k < l; k++)
              if (mutation.addedNodes[k] === node) {
                // Hack to trigger reflow.
                void node.offsetWidth

                node.classList.add(insertClass)
                observer.disconnect()
              }
          }
        })

        observer.observe(document.documentElement, {
          childList: true, subtree: true
        })
      }
      else node.classList.add(insertClass)

    return void 0
  }
}
