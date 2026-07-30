/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "**.ufs.sh" },
      { protocol: "https", hostname: "uploadthing.com" },
      { protocol: "https", hostname: "sea1.ingest.uploadthing.com" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
    outputFileTracingIncludes: {
      "/api/admin/transactions/export": [
        "./node_modules/pdfkit/js/data/**/*",
        "./public/odlogo.png",
      ],
      "/api/admin/expenses/export": [
        "./node_modules/pdfkit/js/data/**/*",
        "./public/odlogo.png",
      ],
    },
  },
};

export default nextConfig;
