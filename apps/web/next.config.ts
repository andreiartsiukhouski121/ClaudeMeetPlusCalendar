import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // E2E-прогон Playwright ходит на 127.0.0.1 (а не localhost — тот на Windows резолвится в ::1).
  // Без этой строки dev-сервер считает такие запросы cross-origin и пишет предупреждение.
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
