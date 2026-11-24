// @ts-check
import { defineConfig } from 'astro/config';

// 배포 원점 중앙 관리 (QR·사이트 링크·자산 경로가 모두 여기에 의존)
// - 현재 저장소: github.com/wondam-sodam/archive → https://wondam-sodam.github.io/archive/
// - Organization 루트(<org>.github.io 저장소)로 옮기면 BASE_PATH=/ 로 빌드
const SITE_URL = process.env.SITE_URL ?? 'https://wondam-sodam.github.io';
const BASE_PATH = process.env.BASE_PATH ?? '/archive';

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'ignore',
  output: 'static',
  build: { format: 'directory', assets: '_assets' },
  devToolbar: { enabled: false },
});
