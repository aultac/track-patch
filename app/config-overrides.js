const webpack = require('webpack');

module.exports = function override(config) {
  // I needed this at one time to get id-client working, but Alex fixed it.

  const fallback = config.resolve.fallback || {};
  Object.assign(fallback, {
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "events": require.resolve("events/"),
    "buffer": require.resolve("buffer/"),
    "string_decoder": require.resolve("string_decoder/"),
    "util": require.resolve("util/"),
    "url": require.resolve('url/'),
  })
  config.resolve.fallback = fallback;

  const plugins = config.plugins || [];
  plugins.push(
    new webpack.NormalModuleReplacementPlugin(
      /node:/,
      (resource) => {
        resource.request = resource.request.replace(/^node:/, '');
      }
    )
  );
  config.plugins = plugins;
  return config;
}
