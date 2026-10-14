import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Eigenständiger Server für das Docker-Image (siehe Dockerfile).
  output: "standalone",
  // PGlite lädt WebAssembly zur Laufzeit und darf nicht gebündelt werden.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
