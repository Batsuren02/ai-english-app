/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

// PWA configuration disabled due to next-pwa compatibility issues
// Re-enable after fixing next-pwa import if needed
// const withPWA = require('next-pwa')({
//   dest: 'public',
//   register: true,
//   skipWaiting: true,
//   disable: process.env.NODE_ENV === 'development',
// });
// module.exports = withPWA(nextConfig);

module.exports = nextConfig;
