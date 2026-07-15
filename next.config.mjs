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
};

export default nextConfig;
