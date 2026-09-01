// Vercel Serverless Function entry point
// Connects Vercel Serverless requests directly to the ClinicOS Express backend
const app = require('../server/src/index');

module.exports = app;
