// 빌드 시 Day JSON 로딩. 하나라도 스키마에 맞지 않으면 빌드를 실패시켜 잘못된 회차가 공개되지 않게 한다.
import { loadDays, publicDays } from './days.mjs';

const modules = import.meta.glob('../content/days/*.json', { eager: true });
const { days, errors } = loadDays(modules);
if (errors.length) {
  throw new Error(`Day JSON 검증 실패:\n${errors.join('\n')}`);
}
export const allPublicDays = publicDays(days);
export const hasSample = allPublicDays.some((d) => d.sample);
