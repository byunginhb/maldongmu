/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@maldongmu/shared"],
  async headers() {
    return [
      {
        source: "/avatars/v1/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};
export default nextConfig;
