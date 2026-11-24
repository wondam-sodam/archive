// 썸네일 클릭 시 기기별 실행 분기 (Website_Spec §4)
// 기준은 category가 아니라 supportedDevices / recommendedDevice / supportedOS 이다.
// 브라우저의 기기 추정은 완벽하지 않으므로 "안내용 UX"로만 사용한다.

/**
 * @typedef {'direct'|'unavailable'|'desktop-only'|'mobile-recommended'|'mobile-only'|'os-unsupported'} LaunchKind
 * @param {{launchUrl: string|null, supportedDevices: string[], recommendedDevice: string|null, supportedOS?: string[]}} project
 * @param {{ mobile: boolean, os?: string|null }} env
 * @returns {{ kind: LaunchKind }}
 */
export function decideLaunch(project, env) {
  if (!project.launchUrl) return { kind: 'unavailable' };
  const supports = (d) => project.supportedDevices.includes(d);
  const os = env.os ?? null;
  const osList = project.supportedOS ?? [];

  if (env.mobile) {
    if (!supports('mobile')) return { kind: 'desktop-only' };
    if (os && osList.length && osList.some((o) => o === 'ios' || o === 'android') && !osList.includes(os)) {
      return { kind: 'os-unsupported' };
    }
    // 모바일 지원 + PC 권장이어도 실행을 막지 않는다 (구현 선택: 바로 실행)
    return { kind: 'direct' };
  }

  if (!supports('desktop')) return { kind: 'mobile-only' };
  if (project.recommendedDevice === 'mobile') return { kind: 'mobile-recommended' };
  if (os && osList.length && osList.some((o) => o === 'windows' || o === 'macos' || o === 'linux') && !osList.includes(os)) {
    return { kind: 'os-unsupported' };
  }
  return { kind: 'direct' };
}

/** UA 기반 대략적 판별 (안내용) */
export function detectEnv(nav = globalThis.navigator) {
  if (!nav) return { mobile: false, os: null };
  const ua = nav.userAgent || '';
  const uaMobile = nav.userAgentData?.mobile;
  const iPadOS = /Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1;
  const mobile = Boolean(uaMobile) || /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua) || iPadOS;
  let os = null;
  if (/iPhone|iPad|iPod/i.test(ua) || iPadOS) os = 'ios';
  else if (/Android/i.test(ua)) os = 'android';
  else if (/Windows/i.test(ua)) os = 'windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macos';
  else if (/Linux|X11|CrOS/i.test(ua)) os = 'linux';
  return { mobile, os };
}

export const OS_LABEL = { windows: 'Windows', macos: 'macOS', linux: 'Linux', ios: 'iOS', android: 'Android' };
