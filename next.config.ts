import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { checkProductionApiUrl } from "./src/lib/build-env";

export default function nextConfig(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) {
    // NEXT_PUBLIC_API_URL is inlined at build time: refuse to build without it.
    const check = checkProductionApiUrl(process.env.NEXT_PUBLIC_API_URL);
    if (!check.ok) throw new Error(check.error);
    if (check.localhost) {
      console.warn(
        "[build] NEXT_PUBLIC_API_URL points to localhost: fine for a local build, wrong for a deployed image.",
      );
    }
  }
  return {};
}
