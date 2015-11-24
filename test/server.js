'use strict'

var http = require('http')
var path = require('path')
var fs = require('fs')

var server = http.createServer(function (request, response) {
  request.pipe(fs.createWriteStream(
    path.join(__dirname, '../coverage.json')))
  request.on('end', function () {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.end(new Buffer(0), function () { server.close() })
  })
})

server.listen(8890)
