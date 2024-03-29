const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    createProxyMiddleware('/room-io', {
      target: process.env.PROXY,
      changeOrigin: true,
      ws: true,
      logLevel: 'debug'
    })
  );
  app.use(
    createProxyMiddleware('/api/room', {
      target: process.env.PROXY,
      changeOrigin: true,
    })
  );
};
