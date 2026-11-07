import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "/*": [
      "./sauvegardes/**/*",
      "./.local-backups/**/*",
      "./.chapter-backups/**/*",
      "**/*.backup*",
      "**/*.bak",
      "**/*-avant-*",
    ],
  },
};

export default nextConfig;
