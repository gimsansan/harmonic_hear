/**
 * 키존(Keyzone) 유틸리티 함수 (§4.2, §12)
 *
 * 목표 Hz를 입력받아 → 최근접 키존 샘플 선택 → detune(cent) 계산.
 * 이 패턴(최근접 샘플 + detune)은 하드웨어/소프트웨어 샘플러에서 **표준·매우 흔한** 패턴입니다.
 */

import { freqToCents } from './pitchUtils';
import { KEYZONE } from '../constants/theme';

/**
 * 키존 샘플 정보
 */
export interface KeyzoneSample {
  /** 샘플 식별자 (예: 'C3', 'D3') */
  id: string;
  /** 기준 주파수 (Hz) */
  hz: number;
  /** 오디오 파일 경로 또는 require() 결과 (나중에 실제 파일 연결) */
  source?: unknown;
  /** 원본 재생 길이 (밀리초) */
  durationMs?: number;
}

/**
 * 키존 선택 결과
 */
export interface KeyzoneResult {
  /** 선택된 샘플 */
  sample: KeyzoneSample;
  /** detune 값 (cent) — 양수=피치업, 음수=피치다운 */
  detuneCents: number;
  /** 최대 시프트 범위 내인지 */
  isWithinLimit: boolean;
  /** cent 거리 (절대값) */
  absCentDistance: number;
}

/**
 * 목표 주파수에 가장 가까운 키존 샘플을 선택하고 detune을 계산합니다.
 *
 * 사양 (§4.2, §12):
 * - 녹음 샘플 간격: 200 cent (온음)
 * - 최대 피치 시프트: ±100 cent (반음) 이내
 * - cent 거리 = 1200 × log2(target / sampleHz)
 *
 * @param targetHz - 목표 주파수 (Hz)
 * @param sampleMap - 사용 가능한 키존 샘플 배열
 * @returns 최근접 샘플 + detune 정보
 *
 * @example
 * const samples: KeyzoneSample[] = [
 *   { id: 'C3', hz: 130.81 },
 *   { id: 'D3', hz: 146.83 },
 *   { id: 'E3', hz: 164.81 },
 * ];
 * findNearestSample(140.0, samples);
 * // → { sample: { id: 'C3', hz: 130.81 }, detuneCents: ≈119, isWithinLimit: false, ... }
 * // → 또는 { id: 'D3', hz: 146.83 }, detuneCents: ≈-82, isWithinLimit: true, ... }
 */
export function findNearestSample(
  targetHz: number,
  sampleMap: KeyzoneSample[],
): KeyzoneResult {
  if (sampleMap.length === 0) {
    throw new Error('sampleMap is empty — 키존 샘플이 최소 1개 필요합니다.');
  }

  let bestIndex = 0;
  let bestAbsDist = Infinity;

  for (let i = 0; i < sampleMap.length; i++) {
    const cents = freqToCents(sampleMap[i].hz, targetHz);
    const absDist = Math.abs(cents);

    if (absDist < bestAbsDist) {
      bestAbsDist = absDist;
      bestIndex = i;
    }
  }

  const chosen = sampleMap[bestIndex];
  const detuneCents = freqToCents(chosen.hz, targetHz);

  return {
    sample: chosen,
    detuneCents,
    isWithinLimit: Math.abs(detuneCents) <= KEYZONE.MAX_SHIFT,
    absCentDistance: Math.abs(detuneCents),
  };
}

/**
 * detune(cent) 값을 ±MAX_SHIFT 범위로 클램핑합니다.
 * 범위 초과 시 경고를 반환합니다.
 */
export function clampDetune(cents: number): {
  clamped: number;
  wasOverLimit: boolean;
} {
  const max = KEYZONE.MAX_SHIFT;
  if (Math.abs(cents) <= max) {
    return { clamped: cents, wasOverLimit: false };
  }
  return {
    clamped: cents > 0 ? max : -max,
    wasOverLimit: true,
  };
}

/**
 * 200 cent(온음) 간격의 기본 키존 맵을 생성합니다.
 * C3(130.81Hz) ~ C5(523.25Hz) 범위.
 *
 * 실제 녹음 파일이 준비되면 source 필드를 채워 연결합니다.
 */
export function createDefaultSampleMap(): KeyzoneSample[] {
  // C3부터 온음(200 cent) 간격으로 올라가는 음 이름
  const notes = [
    { id: 'C3', hz: 130.81 },
    { id: 'D3', hz: 146.83 },
    { id: 'E3', hz: 164.81 },
    { id: 'F#3', hz: 185.0 },
    { id: 'G#3', hz: 207.65 },
    { id: 'A#3', hz: 233.08 },
    { id: 'C4', hz: 261.63 },
    { id: 'D4', hz: 293.66 },
    { id: 'E4', hz: 329.63 },
    { id: 'F#4', hz: 369.99 },
    { id: 'G#4', hz: 415.3 },
    { id: 'A#4', hz: 466.16 },
    { id: 'C5', hz: 523.25 },
  ];

  return notes;
}
