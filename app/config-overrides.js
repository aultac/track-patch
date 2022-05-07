const webpack = require('webpack');
const dotenv = require('dotenv-webpack');

module.exports = {
  webpack: function override(config) {

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
        "process": require.resolve('process'),
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
    plugins.push(new dotenv());
    plugins.push(new webpack.ProvidePlugin({
      'process': 'process'
    }));

    config.plugins = plugins;

    return config;
  },

  devServer: function(configFunction) {
    return function(proxy, allowedHost) {
      const config = configFunction(proxy, allowedHost);

      // Change the https certificate options to match your certificate, using the .env file to
      // set the file paths & passphrase.
      const fs = require('fs');
      config.https = {
        // Use mkcert -cert-file ./localhost/fullchain.pem -key-file ./localhost/privkey.pem localhost
        key: fs.readFileSync('./localhost/privkey.pem', 'utf8'),
        cert: fs.readFileSync('./localhost/fullchain.pem', 'utf8'),
        //ca: fs.readFileSync(process.env.REACT_HTTPS_CA, 'utf8'),
      };

      // Return your customised Webpack Development Server config.
      return config;
    };
  },
};
