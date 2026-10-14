import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite lädt WebAssembly zur Laufzeit und darf nicht gebündelt werden.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
