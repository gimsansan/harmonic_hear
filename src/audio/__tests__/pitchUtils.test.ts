/**
 * pitchUtils 회귀 테스트
 *
 * 명세서 §5.2·§12의 검증 수치를 고정합니다.
 * 이 값들은 임상 타당도 표현과 직결되므로 임의로 바꾸면 안 됩니다.
 */

import {
  calcCoupledDuration,
  centsToFreq,
  clampFreq,
  freqToCents,
  isAudibleFreq,
} from '../pitchUtils';
import { AUDIO } from '../../constants/theme';

describe('centsToFreq', () => {
  it('0 cent면 기준음 그대로다', () => {
    expect(centsToFreq(440, 0)).toBe(440);
  });

  it('+100 cent = 반음 위 (A4 → A#4)', () => {
    expect(centsToFreq(440, 100)).toBeCloseTo(466.16, 2);
  });

  it('-100 cent = 반음 아래 (A4 → Ab4)', () => {
    expect(centsToFreq(440, -100)).toBeCloseTo(415.3, 2);
  });

  it('+1200 cent = 한 옥타브 = 2배', () => {
    expect(centsToFreq(440, 1200)).toBeCloseTo(880, 6);
  });

  it('-1200 cent = 한 옥타브 아래 = 절반', () => {
    expect(centsToFreq(440, -1200)).toBeCloseTo(220, 6);
  });

  it('같은 cent 차이는 기준음이 달라도 같은 비율이다', () => {
    // Hz가 아니라 비율로 재기 때문에 저역·고역에서 체감이 일정하다 (§4)
    expect(centsToFreq(262, 50) / 262).toBeCloseTo(centsToFreq(440, 50) / 440, 9);
  });
});

describe('freqToCents', () => {
  it('centsToFreq의 역함수다', () => {
    [-300, -100, -10, 0, 10, 100, 300].forEach((cents) => {
      expect(freqToCents(440, centsToFreq(440, cents))).toBeCloseTo(cents, 6);
    });
  });

  it('옥타브 위는 1200 cent다', () => {
    expect(freqToCents(440, 880)).toBeCloseTo(1200, 6);
  });
});

describe('calcCoupledDuration — §5.2 방향별 비대칭', () => {
  it('피치 업 +100 cent → 943.9ms (−5.61%)', () => {
    expect(calcCoupledDuration(1000, 100)).toBeCloseTo(943.87, 2);
  });

  it('피치 다운 −100 cent → 1059.5ms (+5.95%)', () => {
    expect(calcCoupledDuration(1000, -100)).toBeCloseTo(1059.46, 2);
  });

  it('업/다운 변화율이 서로 다르다 (단일 수치로 쓰면 안 됨)', () => {
    const up = calcCoupledDuration(1000, 100);
    const down = calcCoupledDuration(1000, -100);

    expect(Math.abs(1000 - up)).not.toBeCloseTo(Math.abs(down - 1000), 1);
  });

  it('0 cent면 길이가 그대로다', () => {
    expect(calcCoupledDuration(1000, 0)).toBe(1000);
  });
});

describe('clampFreq', () => {
  it('허용 대역 안이면 그대로 통과한다', () => {
    expect(clampFreq(440)).toEqual({ clamped: 440, wasOverLimit: false });
  });

  it('하한 미만이면 하한으로 자르고 표시한다', () => {
    expect(clampFreq(150)).toEqual({
      clamped: AUDIO.FREQ_MIN_HZ,
      wasOverLimit: true,
    });
  });

  it('상한 초과면 상한으로 자르고 표시한다', () => {
    expect(clampFreq(5000)).toEqual({
      clamped: AUDIO.FREQ_MAX_HZ,
      wasOverLimit: true,
    });
  });

  it('경계값은 초과로 보지 않는다', () => {
    expect(clampFreq(AUDIO.FREQ_MIN_HZ).wasOverLimit).toBe(false);
    expect(clampFreq(AUDIO.FREQ_MAX_HZ).wasOverLimit).toBe(false);
  });

  it('한도를 직접 넘길 수 있다', () => {
    expect(clampFreq(300, 400, 800)).toEqual({ clamped: 400, wasOverLimit: true });
  });

  it('모든 기준음 프리셋이 허용 대역 안에 있다', () => {
    [262, 330, 440].forEach((hz) => {
      expect(clampFreq(hz).wasOverLimit).toBe(false);
    });
  });
});

describe('isAudibleFreq', () => {
  it.each([20, 440, 20000])('%dHz는 가청 범위다', (hz) => {
    expect(isAudibleFreq(hz)).toBe(true);
  });

  it.each([19, 20001, 0])('%dHz는 가청 범위 밖이다', (hz) => {
    expect(isAudibleFreq(hz)).toBe(false);
  });
});
