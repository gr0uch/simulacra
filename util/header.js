var pkg = require('../package.json')

process.stdout.write([
  '/*!',
  ' * Simulacra.js',
  ' * Version ' + pkg.version,
  ' * https://github.com/0x8890/simulacra',
  ' */', ''
].join('\n'))
