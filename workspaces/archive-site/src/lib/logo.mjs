// 사이트 로고 (헤더·인트로 공용). 원본 교체: public/assets/brand/logo.png
// 빌드 시 scripts/prepare-logo.mjs 가 만든 매니페스트를 읽는다.
import manifest from '../generated/logo.json';
import { withBase } from './paths.mjs';

export const logo = {
  src: `${withBase('/assets/brand/' + manifest.file)}?v=${manifest.v}`,
  width: manifest.width,
  height: manifest.height,
};
