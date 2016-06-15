'use strict'


// Default behavior when a return value is given for a change function.
module.exports = function changeValue (node, value, attribute) {
  switch (attribute) {
  case 'checked':
    if (value) node.checked = 'checked'
    else node.removeAttribute('checked')
    break
  default:
    node[attribute] = value
  }
}
