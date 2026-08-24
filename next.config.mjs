/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/developer",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
