/**
 * 음고(Pitch) 유틸리티 함수 (§5, §12)
 *
 * Hz ↔ cent 변환, 재생 길이 커플링 보정 등
 * 이 패턴(cent↔Hz 변환)은 오디오/음악 앱에서 **표준·매우 흔한** 패턴입니다.
 */

/**
 * 기준 주파수에서 cent만큼 이동한 주파수를 계산합니다.
 *
 * 공식: f = baseHz × 2^(cents / 1200)
 *
 * @example
 * centsToFreq(440, 100)  // → 466.16 (A4 → A#4)
 * centsToFreq(440, -100) // → 415.30 (A4 → Ab4)
 */
export function centsToFreq(baseHz: number, cents: number): number {
  return baseHz * Math.pow(2, cents / 1200);
}

/**
 * 두 주파수 사이의 cent 차이를 계산합니다.
 *
 * 공식: cents = 1200 × log2(targetHz / baseHz)
 *
 * @example
 * freqToCents(440, 466.16) // → ≈ 100 cent
 * freqToCents(440, 415.30) // → ≈ -100 cent
 */
export function freqToCents(baseHz: number, targetHz: number): number {
  return 1200 * Math.log2(targetHz / baseHz);
}

/**
 * 피치 시프트에 의한 재생 길이 커플링을 계산합니다. (§5.2)
 *
 * playbackRate 기반 피치 시프트는 재생 속도를 변화시켜
 * 지속 시간이 비대칭으로 변합니다.
 *
 * 공식: 결과 길이 = 원본 길이 / 2^(detuneCents / 1200)
 *
 * @param originalMs - 원본 재생 길이 (밀리초)
 * @param detuneCents - 피치 이동량 (cent)
 * @returns 실제 재생 길이 (밀리초)
 *
 * @example
 * // 피치 업 (+100 cent): 1000ms → 943.9ms (−5.61%)
 * calcCoupledDuration(1000, 100)   // → 943.87
 * // 피치 다운 (−100 cent): 1000ms → 1059.5ms (+5.95%)
 * calcCoupledDuration(1000, -100)  // → 1059.46
 */
export function calcCoupledDuration(originalMs: number, detuneCents: number): number {
  return originalMs / Math.pow(2, detuneCents / 1200);
}

/**
 * 주어진 주파수가 유효한 가청 범위인지 검증합니다.
 * 인간 가청 범위: 약 20Hz ~ 20,000Hz
 */
export function isAudibleFreq(hz: number): boolean {
  return hz >= 20 && hz <= 20000;
}
