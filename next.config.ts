import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "";

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  serverExternalPackages: ["@resvg/resvg-js"],
  // Bundle catalogue fonts + resvg native binaries for download composites.
  outputFileTracingIncludes: {
    "/api/sm/assets/[id]/download": [
      "./assets/fonts/**/*",
      "./node_modules/@resvg/resvg-js/**/*",
    ],
    "/api/sm/creative-requests/[id]/generate": ["./assets/fonts/**/*"],
    "/api/sm/assets/[id]/regenerate": [
      "./assets/fonts/**/*",
      "./node_modules/@resvg/resvg-js/**/*",
    ],
  },
};

export default nextConfig;
