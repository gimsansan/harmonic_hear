/**
 * AudioEngine 회귀 테스트
 *
 * 지키는 결함 (docs/앱_개선_제안서.md §2):
 * - P0-4 톤 엔벨로프에 서스테인 구간이 없어 톤 전체가 감쇠하던 문제
 *
 * Web Audio의 ramp는 **직전 자동화 이벤트 시점**부터 시작합니다.
 * 따라서 Release 시작점에 setValueAtTime 앵커가 없으면
 * Attack 종료 직후부터 Release 목표 시점까지 계속 감쇠합니다.
 * 이 테스트는 그 앵커의 존재와 램프 종점을 고정합니다.
 */

import { AudioEngine } from '../AudioEngine';
import { AUDIO } from '../../constants/theme';

interface ParamEvent {
  param: string;
  type: 'setValueAtTime' | 'exponentialRampToValueAtTime' | 'linearRampToValueAtTime';
  value: number;
  time: number;
}

// 주의: 이 팩토리 안에서는 TypeScript 파라미터 프로퍼티(`constructor(private x)`)를
// 쓰면 안 됩니다. babel-plugin-jest-hoist가 스코프 밖 변수 참조로 오인해 실패합니다.
jest.mock('react-native-audio-api', () => {
  const events: ParamEvent[] = [];
  const oscillators: { start: number | null; stop: number | null }[] = [];

  class FakeAudioParam {
    name: string;
    constructor(name: string) {
      this.name = name;
    }
    setValueAtTime(value: number, time: number) {
      events.push({ param: this.name, type: 'setValueAtTime', value, time });
      return this;
    }
    exponentialRampToValueAtTime(value: number, time: number) {
      events.push({
        param: this.name,
        type: 'exponentialRampToValueAtTime',
        value,
        time,
      });
      return this;
    }
    linearRampToValueAtTime(value: number, time: number) {
      events.push({
        param: this.name,
        type: 'linearRampToValueAtTime',
        value,
        time,
      });
      return this;
    }
  }

  class FakeOscillator {
    type = 'sine';
    frequency = new FakeAudioParam('frequency');
    record: { start: number | null; stop: number | null };
    constructor() {
      this.record = { start: null, stop: null };
      oscillators.push(this.record);
    }
    connect() {}
    start(time: number) {
      this.record.start = time;
    }
    stop(time: number) {
      this.record.stop = time;
    }
  }

  class FakeGain {
    gain = new FakeAudioParam('gain');
    connect() {}
  }

  class FakeBiquad {
    type = '';
    frequency = new FakeAudioParam('filterFreq');
    Q = new FakeAudioParam('filterQ');
    connect() {}
  }

  class FakeAudioContext {
    state = 'running';
    currentTime = 0;
    destination = {};
    createOscillator() {
      return new FakeOscillator();
    }
    createGain() {
      return new FakeGain();
    }
    createBiquadFilter() {
      return new FakeBiquad();
    }
    async resume() {
      this.state = 'running';
    }
    close() {
      this.state = 'closed';
    }
  }

  return {
    AudioContext: FakeAudioContext,
    __events: events,
    __oscillators: oscillators,
    __reset: () => {
      events.length = 0;
      oscillators.length = 0;
    },
  };
});

// jest.mock 호출은 babel이 import보다 위로 끌어올리므로 순서는 안전하다
const audioApiMock = jest.requireMock('react-native-audio-api') as {
  __events: ParamEvent[];
  __oscillators: { start: number | null; stop: number | null }[];
  __reset: () => void;
};

/** gain 파라미터에 예약된 이벤트만 시간순으로 뽑는다. */
function gainEvents(): ParamEvent[] {
  return audioApiMock.__events.filter((e) => e.param === 'gain');
}

beforeEach(() => {
  audioApiMock.__reset();
});

describe.each([
  ['wave' as const, AUDIO.PEAK_GAIN_WAVE, 'exponentialRampToValueAtTime' as const],
  ['voice' as const, AUDIO.PEAK_GAIN_VOICE, 'linearRampToValueAtTime' as const],
])('P0-4 — %s 모드 엔벨로프', (mode, peak, rampType) => {
  const duration = AUDIO.TONE_DURATION;

  async function playOnce() {
    const engine = new AudioEngine();
    engine.init();
    await engine.playTone(440, 0, duration, mode);
    return gainEvents();
  }

  it('Release 시작점에 서스테인 앵커가 있다', async () => {
    const events = await playOnce();
    const releaseStart = duration - AUDIO.RELEASE_TIME;

    // 이 앵커가 없으면 Attack 종료 직후부터 톤 끝까지 계속 감쇠한다 (= P0-4 재발)
    const anchor = events.find(
      (e) => e.type === 'setValueAtTime' && e.time === releaseStart,
    );
    expect(anchor).toBeDefined();
    expect(anchor!.value).toBe(peak);
  });

  it('마지막 램프가 톤 끝에서 끝난다', async () => {
    const events = await playOnce();
    const last = events[events.length - 1];

    // 수정 전에는 종점이 duration - RELEASE_TIME(0.95)이었다
    expect(last.type).toBe(rampType);
    expect(last.time).toBeCloseTo(duration, 6);
    expect(last.value).toBeLessThan(peak);
  });

  it('Release 직전까지 게인이 피크로 유지된다', async () => {
    const events = await playOnce();
    const releaseStart = duration - AUDIO.RELEASE_TIME;

    // Release 시작 시점에 유효한 마지막 자동화 값이 곧 그 구간의 게인이다.
    // 앵커가 없으면 이 값이 0에 가까운 감쇠 목표가 된다 (= P0-4 재발).
    const lastBeforeRelease = events
      .filter((e) => e.time <= releaseStart)
      .pop()!;

    expect(lastBeforeRelease.value).toBe(peak);
  });

  it('서스테인 구간이 톤 길이의 80% 이상이다', async () => {
    const events = await playOnce();

    // 피크에 도달하는 첫 이벤트 = Attack 종료
    const attackEnd = events.find((e) => e.value === peak)!.time;
    // 피크를 유지하는 마지막 이벤트 = Release 시작
    const releaseStart = events.filter((e) => e.value === peak).pop()!.time;
    const sustain = releaseStart - attackEnd;

    expect(sustain).toBeGreaterThan(0);
    expect(sustain).toBeGreaterThanOrEqual(duration * 0.8);
  });

  it('이벤트가 시간순으로 예약된다', async () => {
    const events = await playOnce();
    const times = events.map((e) => e.time);

    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('오실레이터가 톤 길이만큼 재생된다', async () => {
    await playOnce();
    const [osc] = audioApiMock.__oscillators;

    expect(osc.start).toBe(0);
    expect(osc.stop).toBeCloseTo(duration, 6);
  });
});

describe('P0-4 — 짧은 톤에서도 구간 순서가 뒤집히지 않는다', () => {
  it('Attack+Release보다 짧은 톤도 시간순을 유지한다', async () => {
    const shortDuration = AUDIO.ATTACK_TIME / 2; // 25ms
    const engine = new AudioEngine();
    engine.init();
    await engine.playTone(440, 0, shortDuration, 'wave');

    const times = gainEvents().map((e) => e.time);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(Math.max(...times)).toBeCloseTo(shortDuration, 6);
  });
});

describe('startTimeOffset', () => {
  it('오프셋만큼 뒤로 밀어 예약한다', async () => {
    const offset = 1.5;
    const engine = new AudioEngine();
    engine.init();
    await engine.playTone(440, offset, AUDIO.TONE_DURATION, 'wave');

    const events = gainEvents();
    expect(events[0].time).toBeCloseTo(offset, 6);
    expect(events[events.length - 1].time).toBeCloseTo(
      offset + AUDIO.TONE_DURATION,
      6,
    );
  });
});

describe('P0-5 — 오디오 클럭 기준 일괄 예약', () => {
  const duration = AUDIO.TONE_DURATION;
  const gap = AUDIO.GAP_DURATION;

  it('두 톤이 하나의 기준점 위에 예약된다', async () => {
    const engine = new AudioEngine();
    engine.init();

    await engine.playSequence(
      [
        { freq: 440, offset: 0, duration },
        { freq: 466, offset: duration + gap, duration },
      ],
      'wave',
    );

    const events = gainEvents();
    const firstStart = events[0].time;
    const secondStart = events.find((e) => e.time >= duration + gap)!.time;

    // A 시작 → B 시작 간격이 정확히 (톤 길이 + 갭)
    expect(secondStart - firstStart).toBeCloseTo(duration + gap, 6);
  });

  it('오실레이터 두 개가 예약된 시각에 시작한다', async () => {
    const engine = new AudioEngine();
    engine.init();

    await engine.playSequence(
      [
        { freq: 440, offset: 0, duration },
        { freq: 466, offset: duration + gap, duration },
      ],
      'wave',
    );

    const [oscA, oscB] = audioApiMock.__oscillators;
    expect(oscA.start).toBeCloseTo(0, 6);
    expect(oscB.start).toBeCloseTo(duration + gap, 6);
    expect(oscA.stop).toBeCloseTo(duration, 6);
    expect(oscB.stop).toBeCloseTo(duration + gap + duration, 6);
  });

  it('voice 모드도 동일하게 예약된다', async () => {
    const engine = new AudioEngine();
    engine.init();

    await engine.playSequence(
      [
        { freq: 440, offset: 0, duration },
        { freq: 466, offset: duration + gap, duration },
      ],
      'voice',
    );

    const [oscA, oscB] = audioApiMock.__oscillators;
    expect(oscB.start! - oscA.start!).toBeCloseTo(duration + gap, 6);
  });

  it('예약 성공 여부를 반환한다', async () => {
    const engine = new AudioEngine();
    engine.init();

    const ok = await engine.playSequence(
      [{ freq: 440, offset: 0, duration }],
      'wave',
    );

    expect(ok).toBe(true);
  });

  it('빈 목록도 안전하게 처리한다', async () => {
    const engine = new AudioEngine();
    engine.init();

    const ok = await engine.playSequence([], 'wave');

    expect(ok).toBe(true);
    expect(gainEvents()).toHaveLength(0);
  });
});

describe('컨텍스트 수명주기', () => {
  it('dispose 후 playTone은 새 컨텍스트로 복구한다', async () => {
    const engine = new AudioEngine();
    engine.init();
    engine.dispose();

    await engine.playTone(440, 0, AUDIO.TONE_DURATION, 'wave');

    expect(gainEvents().length).toBeGreaterThan(0);
  });

  it('init 없이 playTone을 불러도 재생된다', async () => {
    const engine = new AudioEngine();

    await engine.playTone(440, 0, AUDIO.TONE_DURATION, 'wave');

    expect(gainEvents().length).toBeGreaterThan(0);
  });
});
