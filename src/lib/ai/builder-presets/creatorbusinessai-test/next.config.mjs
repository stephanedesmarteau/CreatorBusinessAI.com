/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/project-analyses/:path*",
        destination: "http://localhost:3000/api/project-analyses/:path*"
      },
      {
        source: "/api/studionova-projects",
        destination: "http://localhost:3000/api/studionova-projects"
      }
    ];
  }
};

export default nextConfig;
