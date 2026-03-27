/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/kunden",
        destination: "/einstellungen?tab=kunden",
        permanent: false,
      },
      {
        source: "/abteilungen",
        destination: "/einstellungen?tab=abteilungen",
        permanent: false,
      },
      {
        source: "/benachrichtigungen",
        destination: "/einstellungen?tab=integrationen",
        permanent: false,
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
