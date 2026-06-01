module.exports = {
  '/api': {
    target: process.env['E2E_API_PROXY_TARGET'] ?? 'http://localhost:3001',
    secure: false,
  },
};
