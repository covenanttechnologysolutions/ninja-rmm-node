const path = require('path')

module.exports = {
  entry: './src/ninja-rmm.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    library: {
      name: 'NinjaRMM',
      type: 'umd',
      export: 'default',
    },
    globalObject: 'this',
    clean: true,
  },
  target: 'node',
  mode: 'production',
}
