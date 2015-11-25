var pkg = require('../package.json')

process.stdout.write([
  '/*!',
  ' * Simulacra.js',
  ' * Version ' + pkg.version,
  ' * ' + pkg.license + ' License',
  ' * https://github.com/0x8890/simulacra',
  ' */', ''
].join('\n'))
