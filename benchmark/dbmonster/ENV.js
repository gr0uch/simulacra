void function () {
  'use strict'

  var mutationsValue = 0.5
  var data, ENV

  function getElapsedClassName (elapsed) {
    var className = 'Query elapsed '

    if (elapsed >= 10) className += 'warn_long'
    else if (elapsed >= 1) className += 'warn'
    else className += 'short'

    return className
  }

  function countClassName (queries) {
    var countClassName = 'label '

    if (queries >= 10) countClassName += 'label-warning'
    else countClassName += 'label-success'

    return countClassName
  }

  function generateRow (object) {
    var nbQueries = Math.floor(Math.random() * 10) + 1
    var i, elapsed, dice, query

    if (!object) object = {}
    if (!object.lastSample) object.lastSample = {}
    if (!object.topFiveQueries) {
      object.topFiveQueries = []
      for (i = 0; i < 5; i++) object.topFiveQueries[i] = {}
    }

    for (i = 0; i < 5; i++) {
      query = object.topFiveQueries[i]
      if (i <= nbQueries) {
        elapsed = Math.random() * 15
        dice = Math.random()
        query.formatElapsed = parseFloat(elapsed).toFixed(2)
        query.elapsedClassName = getElapsedClassName(elapsed)
        if (dice < 0.2) query.query = '<IDLE> in transaction'
        else if (dice < 0.1) query.query = 'vacuum'
        else query.query = 'SELECT blah FROM something'
      }
      else {
        query.formatElapsed = ''
        query.elapsedClassName = ''
        query.query = ''
      }
    }

    object.lastSample.nbQueries = nbQueries;
    object.lastSample.countClassName = countClassName(nbQueries);

    return object
  }

  function getData (keepIdentity) {
    var oldData = data
    var i, row

    if (!keepIdentity) {
      data = []
      for (i = 1; i <= ENV.rows; i++) {
        data.push({ dbname: 'cluster' + i })
        data.push({ dbname: 'cluster' + i + ' slave' })
      }
    }

    for (i in data) {
      row = data[i]
      if (!row.lastSample || Math.random() < ENV.mutations())
        generateRow(row)
    }

    return { toArray: function () { return data } }
  }

  function mutations (value) {
    if (value !== void 0) mutationsValue = value
    return mutationsValue
  }

  var body = document.querySelector('body')
  var theFirstChild = body.firstChild

  var sliderContainer = document.createElement('div')
  sliderContainer.style.cssText = 'display: flex;'
  var slider = document.createElement('input')
  var text = document.createElement('label')
  text.innerHTML = 'mutations : ' + (mutationsValue * 100).toFixed(0) + '%'
  text.id = "ratioval"
  slider.setAttribute("type", "range")
  slider.style.cssText = 'margin-bottom: 10px; margin-top: 5px;'
  slider.addEventListener('change', function (e) {
    ENV.mutations(e.target.value / 100)
    document.querySelector('#ratioval').innerHTML = 'mutations : ' + (ENV.mutations() * 100).toFixed(0) + '%'
  })
  sliderContainer.appendChild(text)
  sliderContainer.appendChild(slider)
  body.insertBefore(sliderContainer, theFirstChild)

  ENV = window.ENV = {
    generateData: getData,
    rows: 50,
    timeout: 0,
    mutations: mutations
  }
}()
