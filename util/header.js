var pkg = require('../package.json')

process.stdout.write([
  '/*!',
  ' * Simulacra.js',
  ' * Version ' + pkg.version,
  ' * ' + pkg.license + ' License',
  ' * ' + pkg.homepage,
  ' */', ''
].join('\n'))
