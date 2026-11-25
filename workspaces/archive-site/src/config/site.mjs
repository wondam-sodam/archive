// 사이트 공통 설정.
// 인스타그램 링크는 src/config/social.json 에서 관리한다 (로컬 관리자 화면에서도 수정 가능).
//   wondamsodam = 원담소담 공용 계정, sodam = 소담 개인 계정, seowon = 서원 개인 계정
//   비워 두면("") 사이트에 표시되지 않는다. 형식: https://www.instagram.com/<아이디>/
import social from './social.json';

export const INSTAGRAM_RE = /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]{1,30}\/?$/;

const ig = (v) => (typeof v === 'string' && INSTAGRAM_RE.test(v.trim()) ? v.trim() : null);

export const SITE = {
  name: '원담소담',
  slogan: '같은 주제, 다른 상상. 둘이 만드는 하루.',
  description: '소담과 서원이 같은 미션으로 각자 만든 작은 프로그램을 모아 두는 아카이브.',
  instagram: ig(social.wondamsodam),
  instagramSodam: ig(social.sodam),
  instagramSeowon: ig(social.seowon),
};

/** 화면에 보여 줄 인스타그램 링크 목록 (값이 있는 것만) */
export const INSTAGRAM_LINKS = [
  { key: 'wondamsodam', label: '원담소담', url: SITE.instagram },
  { key: 'sodam', label: '소담', url: SITE.instagramSodam },
  { key: 'seowon', label: '서원', url: SITE.instagramSeowon },
].filter((l) => l.url);
