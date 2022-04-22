const webpack = require('webpack');
const dotenv = require('dotenv-webpack');

module.exports = function override(config) {


/*
  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "events": require.resolve("events/"),
    "buffer": require.resolve("buffer/"),
    "string_decoder": require.resolve("string_decoder/"),
    "util": require.resolve("util/"),
    "url": require.resolve('url/'),
    "path": require.resolve('path-browserify'),
  })
  config.resolve.fallback = fallback;

*/
  const plugins = config.plugins || [];
/*
  plugins.push(
    new webpack.NormalModuleReplacementPlugin(
      /node:/,
      (resource) => {
        resource.request = resource.request.replace(/^node:/, '');
      }
    )
  );
*/
  plugins.push(new dotenv());
  config.plugins = plugins;

  return config;
}
