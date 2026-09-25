import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Playwright hits 127.0.0.1 (not localhost — that resolves to ::1 on Windows). Without this the
  // dev server treats such requests as cross-origin and logs a warning.
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
