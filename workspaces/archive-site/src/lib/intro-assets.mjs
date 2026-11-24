// 생성된 인트로 매니페스트(scripts/optimize-intro.mjs) → base 경로가 포함된 URL
import manifest from '../generated/intro-manifest.json';
import { withBase } from './paths.mjs';

const url = (entry) => `${withBase('/assets/intro/' + entry.file)}?v=${entry.v}`;

export const intro = {
  bg: { ...manifest.bg, src: url(manifest.bg) },
  bgSmall: { ...manifest.bgSmall, src: url(manifest.bgSmall) },
  desk: { ...manifest.desk, src: url(manifest.desk) },
  monitor: { ...manifest.monitor, src: url(manifest.monitor) },
  logo: { ...manifest.logo, src: url(manifest.logo) },
  sodam: Object.fromEntries(['idle_closed', 'opening', 'active'].map((s) => [s, { ...manifest.sodam[s], src: url(manifest.sodam[s]) }])),
  seowon: Object.fromEntries(['idle_closed', 'opening', 'active'].map((s) => [s, { ...manifest.seowon[s], src: url(manifest.seowon[s]) }])),
};
