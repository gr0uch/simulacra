var pkg = require('../package.json')

process.stdout.write([
  '/*!',
  ' * Simulacra.js',
  ' * Version ' + pkg.version,
  ' * Copyright (c) ' + new Date().getFullYear() +
    ' 0x8890 <0x8890@airmail.cc>',
  ' * ' + pkg.license + ' License',
  ' * https://github.com/0x8890/simulacra',
  ' */', ''
].join('\n'))
