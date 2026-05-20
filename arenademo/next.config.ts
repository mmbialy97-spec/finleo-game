import type { NextConfig } from "next";
// VERCEL PRIMITIVE: Workflows — withWorkflow() enables the `"use workflow"` and `"use step"` directives.
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The @vercel/sandbox SDK is server-only and shouldn't be bundled.
  serverExternalPackages: ["@vercel/sandbox"],
};

export default withWorkflow(nextConfig);
