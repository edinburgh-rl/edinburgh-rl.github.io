import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.PAGES_BASE_PATH,
  images: { unoptimized: true },
  // Let Sass resolve package imports natively, including on Windows/Turbopack.
  sassOptions: { loadPaths: [path.join(process.cwd(), "node_modules"), path.join(process.cwd(), "node_modules/bulma/sass")] }
};

export default nextConfig;
