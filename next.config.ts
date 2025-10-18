// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // 本番ビルドで ESLint を無視したい場合のみ（任意）
  // eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
