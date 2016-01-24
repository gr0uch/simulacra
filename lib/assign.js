'use strict'

/**
 * Like `Object.assign`, but faster and more restricted in what it does.
 *
 * @param {Object} target
 * @param {Object} source
 * @return {Object}
 */
module.exports = function assign (target, source) {
  var key

  for (key in source) target[key] = source[key]

  return target
}
