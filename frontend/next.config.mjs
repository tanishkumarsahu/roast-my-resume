import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdfjs-dist"],
  turbopack: {
    root: path.join(process.cwd(), ".."),
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";

    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${backendUrl}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
