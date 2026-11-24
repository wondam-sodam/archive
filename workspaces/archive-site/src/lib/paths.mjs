// base 경로(예: /archive) 를 안전하게 붙이는 헬퍼
export function withBase(p = '/') {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  const path = String(p).startsWith('/') ? p : `/${p}`;
  return `${base}${path}` || '/';
}
export const dayPath = (n) => withBase(`/archive/${n}/`);
