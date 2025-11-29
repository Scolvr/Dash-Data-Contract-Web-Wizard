/**
 * Webpack configuration to bundle @dashevo/wasm-dpp for browser
 * This creates a browser-compatible bundle with all Node.js polyfills
 */

const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: './src/integrations/wasm-dpp-entry.cjs',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'wasm-dpp-browser.js',
    library: {
      name: 'WasmDpp',
      type: 'umd',
      export: 'default',
    },
    globalObject: 'this',
  },
  mode: 'production',
  optimization: {
    minimize: false, // Keep readable for debugging
  },
  experiments: {
    asyncWebAssembly: true,
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
  ],
  resolve: {
    extensions: ['.js'],
    fallback: {
      fs: false,
      ws: false,
      crypto: require.resolve('crypto-browserify'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      stream: require.resolve('stream-browserify'),
      path: require.resolve('path-browserify'),
      url: require.resolve('url/'),
      util: require.resolve('util/'),
      buffer: require.resolve('buffer/'),
      events: require.resolve('events/'),
      assert: require.resolve('assert/'),
      string_decoder: require.resolve('string_decoder/'),
      process: require.resolve('process/browser'),
    },
  },
};
