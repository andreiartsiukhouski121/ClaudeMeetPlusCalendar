import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Playwright hits 127.0.0.1 (not localhost — that resolves to ::1 on Windows). Without this the
  // dev server treats such requests as cross-origin and logs a warning.
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    // Raised so a rejection the user sees is always the API's documented 413 (ceiling 1 048 576
    // bytes), never Next's own unmeasured one. This applies to every Server Action, including the
    // unauthenticated `loginAction` — a deliberate gap recorded in `docs/security.md` (task 18).
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
