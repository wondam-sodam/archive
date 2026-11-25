// 인트로 스크롤 줌 컨트롤러
// - 강제 스크롤 잠금 없음. 스크롤 진행도(0→1)에 따라 모니터 화면(로고)이 화면 전체를 덮도록 확대하고,
//   끝부분에서 흰색으로 완전히 전환한다. 이후 일반 스크롤로 아래 회차 검색 화면이 올라온다.
// - 모션 감소 설정이거나 오류가 나면 확대 없이 정지 화면으로 남고, 아래 HTML 아카이브/검색은 그대로 동작한다.

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function startIntro() {
  const root = document.querySelector<HTMLElement>('[data-intro]');
  if (!root) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  try {
    setupZoom(root);
  } catch (err) {
    delete root.dataset.zoomable;
    console.warn('[intro] fallback to static scene', err);
  }
}

function setupZoom(root: HTMLElement) {
  const zoomer = root.querySelector<HTMLElement>('[data-zoomer]')!;
  const viewport = root.querySelector<HTMLElement>('[data-viewport]')!;
  const screen = root.querySelector<HTMLElement>('[data-screen]')!;
  const whiteout = root.querySelector<HTMLElement>('[data-whiteout]')!;
  const sticky = viewport.parentElement!;

  let C = { x: 0, y: 0 }; // 모니터 화면 중심 (뷰포트 좌표)
  let V = { x: 0, y: 0 }; // 뷰포트 중심
  let S = 1; // 모니터 화면 폭이 뷰포트 폭을 넘어서는 배율 (남는 위아래는 흰색 전환이 덮는다)
  let ticking = false;

  function measure() {
    zoomer.style.setProperty('--zoom', '1');
    zoomer.style.setProperty('--tx', '0px');
    zoomer.style.setProperty('--ty', '0px');
    const vr = viewport.getBoundingClientRect();
    const sr = screen.getBoundingClientRect();
    if (!sr.width || !sr.height) return;
    C = { x: sr.left - vr.left + sr.width / 2, y: sr.top - vr.top + sr.height / 2 };
    V = { x: vr.width / 2, y: vr.height / 2 };
    // 세로 화면에서 높이까지 덮으려면 7배 이상 확대돼 로고가 뭉개지므로 폭 기준으로만 확대
    S = (vr.width / sr.width) * 1.12;
    update();
  }

  function progress() {
    const run = root.offsetHeight - sticky.offsetHeight;
    if (run <= 0) return 0;
    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 56;
    return clamp01((headerH - root.getBoundingClientRect().top) / run);
  }

  function update() {
    ticking = false;
    const p = progress();
    const e = easeInOut(clamp01(p / 0.72));
    const z = 1 + (S - 1) * e;
    // 화면 중심 C 가 뷰포트 중심 V 로 이동하면서 확대 (transform-origin 0 0 기준)
    const cx = C.x + (V.x - C.x) * e;
    const cy = C.y + (V.y - C.y) * e;
    zoomer.style.setProperty('--zoom', z.toFixed(4));
    zoomer.style.setProperty('--tx', `${(cx - z * C.x).toFixed(2)}px`);
    zoomer.style.setProperty('--ty', `${(cy - z * C.y).toFixed(2)}px`);
    whiteout.style.setProperty('--white', clamp01((p - 0.45) / 0.3).toFixed(3));
  }

  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  root.dataset.zoomable = '';
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => requestAnimationFrame(measure));
  measure();
}
