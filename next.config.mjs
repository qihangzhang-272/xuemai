/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["node:sqlite"],
  devIndicators: false,
  experimental: {
    // Next 15's dev segment explorer can intermittently break the app-router
    // client manifest in local QA. The product UI does not need this overlay.
    devtoolSegmentExplorer: false
  }
};

export default nextConfig;
