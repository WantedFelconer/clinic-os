// Vercel Serverless Function entry point
// Connects Vercel Serverless requests directly to the ClinicOS Express backend
const app = require('../server/src/index');

module.exports = (req, res) => {
  // Ensure req.url retains the /api prefix expected by Express routers
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
};
