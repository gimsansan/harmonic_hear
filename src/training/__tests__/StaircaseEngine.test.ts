/**
 * StaircaseEngine 테스트
 *
 * 2단계(P1-1 역치 산출 / P1-3 가변 스텝 / P1-7 연속 카운터 분리) 규칙을 고정합니다.
 */

import { StaircaseEngine } from '../StaircaseEngine';
import { AUDIO, STAIRCASE } from '../../constants/theme';
import { centsToFreq } from '../../audio/pitchUtils';

const STEP_LARGE = STAIRCASE.STEP_SCHEDULE[0].step; // 반전 0~1회
const STEP_MID = STAIRCASE.STEP_SCHEDULE[1].step; //   반전 2~3회
const STEP_SMALL = STAIRCASE.STEP_SCHEDULE[2].step; // 반전 4회~

/** 방향을 알고 있으므로 의도한 정오답을 만들 수 있다. */
function answer(engine: StaircaseEngine, correct: boolean) {
  const { isHigher } = engine.prepareRound();
  return engine.submitAnswer(correct ? isHigher : !isHigher);
}

/** 정오답 시퀀스를 한 번에 흘려보낸다. (true=정답) */
function run(engine: StaircaseEngine, sequence: boolean[]) {
  sequence.forEach((correct) => answer(engine, correct));
  return engine.getState();
}

describe('초기 상태', () => {
  it('쉬운 값에서 시작한다 (P1-3)', () => {
    const state = new StaircaseEngine(440).getState();

    expect(state.centsDifference).toBe(STAIRCASE.INITIAL_CENTS);
    expect(STAIRCASE.INITIAL_CENTS).toBeGreaterThanOrEqual(150);
  });

  it('가장 큰 조정 폭으로 시작한다', () => {
    expect(new StaircaseEngine(440).getState().currentStep).toBe(STEP_LARGE);
  });

  it('카운터가 모두 0이다', () => {
    const state = new StaircaseEngine(440).getState();

    expect(state.streak).toBe(0);
    expect(state.stepCounter).toBe(0);
    expect(state.totalTrials).toBe(0);
    expect(state.correctCount).toBe(0);
    expect(state.reversalCount).toBe(0);
  });

  it('baseFreq를 생략하면 AUDIO.BASE_FREQ를 쓴다', () => {
    expect(new StaircaseEngine().getState().baseFreq).toBe(AUDIO.BASE_FREQ);
  });

  it('getState는 내부 상태의 복사본을 준다', () => {
    const engine = new StaircaseEngine(440);
    const state = engine.getState() as { centsDifference: number };
    state.centsDifference = 999;

    expect(engine.getState().centsDifference).toBe(STAIRCASE.INITIAL_CENTS);
  });
});

describe('2-down-1-up 기본 규칙', () => {
  it('정답 1회로는 격차가 줄지 않는다', () => {
    const engine = new StaircaseEngine(440);

    answer(engine, true);

    expect(engine.getState().centsDifference).toBe(STAIRCASE.INITIAL_CENTS);
  });

  it('연속 2회 정답에서 현재 스텝만큼 줄어든다', () => {
    const engine = new StaircaseEngine(440);

    run(engine, [true, true]);

    expect(engine.getState().centsDifference).toBe(
      STAIRCASE.INITIAL_CENTS - STEP_LARGE,
    );
  });

  it('오답 1회로 바로 현재 스텝만큼 늘어난다', () => {
    const engine = new StaircaseEngine(440);

    answer(engine, false);

    expect(engine.getState().centsDifference).toBe(
      Math.min(STAIRCASE.MAX_CENTS, STAIRCASE.INITIAL_CENTS + STEP_LARGE),
    );
  });

  it('오답은 하강 카운터를 리셋한다', () => {
    const engine = new StaircaseEngine(440);

    run(engine, [true, false, true]); // 정답1 → 오답 → 정답1 (하강 없어야 함)

    // 200 → (오답) 250 → 유지
    expect(engine.getState().centsDifference).toBe(
      Math.min(STAIRCASE.MAX_CENTS, STAIRCASE.INITIAL_CENTS + STEP_LARGE),
    );
  });

  it('MIN_CENTS 아래로 내려가지 않는다', () => {
    const engine = new StaircaseEngine(440);

    run(engine, Array(200).fill(true));

    expect(engine.getState().centsDifference).toBe(STAIRCASE.MIN_CENTS);
  });

  it('MAX_CENTS 위로 올라가지 않는다', () => {
    const engine = new StaircaseEngine(440);

    run(engine, Array(200).fill(false));

    expect(engine.getState().centsDifference).toBe(STAIRCASE.MAX_CENTS);
  });
});

describe('P1-7 — 표시용 연속과 하강 카운터 분리', () => {
  it('연속 정답이 2를 넘어서도 계속 누적된다', () => {
    const engine = new StaircaseEngine(440);
    const seen: number[] = [];

    for (let i = 0; i < 5; i++) {
      seen.push(answer(engine, true).newState.streak);
    }

    // 수정 전에는 하강 트리거마다 0으로 리셋돼 1을 넘지 못했다
    expect(seen).toEqual([1, 2, 3, 4, 5]);
  });

  it('하강 카운터는 2에 도달하면 0으로 돌아간다', () => {
    const engine = new StaircaseEngine(440);
    const seen: number[] = [];

    for (let i = 0; i < 5; i++) {
      seen.push(answer(engine, true).newState.stepCounter);
    }

    expect(seen).toEqual([1, 0, 1, 0, 1]);
  });

  it('오답은 둘 다 0으로 만든다', () => {
    const engine = new StaircaseEngine(440);

    run(engine, [true, true, true]);
    const state = answer(engine, false).newState;

    expect(state.streak).toBe(0);
    expect(state.stepCounter).toBe(0);
  });
});

describe('P1-3 — 가변 스텝', () => {
  /**
   * 결정적 시나리오. 각 단계의 격차·반전·스텝을 손으로 계산해 고정한다.
   *
   *  #  답  격차 변화              반전            다음 스텝
   *  1  O   200 (하강 카운터 1)     -               50
   *  2  O   200 → 150 (down)       -  (첫 이동)     50
   *  3  O   150
   *  4  O   150 → 100 (down)       -  (같은 방향)   50
   *  5  X   100 → 150 (up)         #1 @100         50
   *  6  O   150
   *  7  O   150 → 100 (down)       #2 @150         20
   *  8  O   100
   *  9  O   100 →  80 (down)       -               20
   * 10  X    80 → 100 (up)         #3 @80          20
   * 11  O   100
   * 12  O   100 →  80 (down)       #4 @100         10
   */
  const SCENARIO = [
    true, true, true, true, false,
    true, true, true, true, false,
    true, true,
  ];

  it('반전이 쌓이면 조정 폭이 좁아진다', () => {
    const engine = new StaircaseEngine(440);
    const steps: number[] = [];

    SCENARIO.forEach((correct) => {
      steps.push(answer(engine, correct).newState.currentStep);
    });

    expect(steps).toEqual([
      STEP_LARGE, STEP_LARGE, STEP_LARGE, STEP_LARGE, STEP_LARGE,
      STEP_LARGE, STEP_MID, STEP_MID, STEP_MID, STEP_MID,
      STEP_MID, STEP_SMALL,
    ]);
  });

  it('시나리오대로 격차가 움직인다', () => {
    const engine = new StaircaseEngine(440);
    const cents: number[] = [];

    SCENARIO.forEach((correct) => {
      cents.push(answer(engine, correct).newState.centsDifference);
    });

    expect(cents).toEqual([
      200, 150, 150, 100, 150,
      150, 100, 100, 80, 100,
      100, 80,
    ]);
  });

  it('큰 스텝 덕분에 초반에 빠르게 하강한다', () => {
    const engine = new StaircaseEngine(440);

    // 4문항 정답이면 200 → 100
    run(engine, [true, true, true, true]);

    expect(engine.getState().centsDifference).toBe(
      STAIRCASE.INITIAL_CENTS - STEP_LARGE * 2,
    );
  });
});

describe('P1-1 — 반전 기록과 역치', () => {
  const SCENARIO = [
    true, true, true, true, false,
    true, true, true, true, false,
    true, true,
  ];

  it('방향이 바뀐 지점의 격차를 기록한다', () => {
    const engine = new StaircaseEngine(440);

    run(engine, SCENARIO);

    expect(engine.getReversals()).toEqual([100, 150, 80, 100]);
  });

  it('첫 이동은 반전이 아니다', () => {
    const engine = new StaircaseEngine(440);

    run(engine, [true, true]); // 첫 하강

    expect(engine.getState().reversalCount).toBe(0);
  });

  it('같은 방향으로 계속 움직이면 반전이 아니다', () => {
    const engine = new StaircaseEngine(440);

    run(engine, [true, true, true, true]); // 하강 두 번

    expect(engine.getState().reversalCount).toBe(0);
  });

  it('MIN/MAX에 걸려 격차가 그대로면 반전으로 세지 않는다', () => {
    const engine = new StaircaseEngine(440);

    // MAX까지 밀어붙인 뒤 계속 오답 → 값이 안 움직이므로 반전 없음
    run(engine, Array(50).fill(false));
    const atMax = engine.getState().reversalCount;

    run(engine, Array(20).fill(false));

    expect(engine.getState().centsDifference).toBe(STAIRCASE.MAX_CENTS);
    expect(engine.getState().reversalCount).toBe(atMax);
  });

  it('반전이 부족하면 역치를 내지 않는다', () => {
    const engine = new StaircaseEngine(440);

    run(engine, [true, true, true, true, false]); // 반전 1회

    expect(engine.getState().reversalCount).toBeLessThan(
      STAIRCASE.THRESHOLD_MIN_REVERSALS,
    );
    expect(engine.getThreshold()).toBeNull();
  });

  it('초기 반전을 버리고 나머지를 평균낸다', () => {
    const engine = new StaircaseEngine(440);

    run(engine, SCENARIO);

    // 반전 [100, 150, 80, 100] → 앞 2개 버림 → [80, 100] → 평균 90
    expect(engine.getThreshold()).toBe(90);
  });

  it('역치는 최솟값보다 안정적이다 — 운 좋은 한 번에 끌려가지 않는다', () => {
    const engine = new StaircaseEngine(440);

    run(engine, SCENARIO);

    const threshold = engine.getThreshold()!;
    const minReached = Math.min(
      ...[200, 150, 150, 100, 150, 150, 100, 100, 80, 100, 100, 80],
    );

    // 최솟값(80)은 한 번 스친 지점, 역치(90)는 여러 반전의 평균
    expect(minReached).toBe(80);
    expect(threshold).toBeGreaterThan(minReached);
  });

  it('홀수 개가 남으면 하나 더 버려 짝수로 맞춘다', () => {
    // 반전 5회를 만들고, 사용된 개수가 짝수인지 확인
    const engine = new StaircaseEngine(440);
    const seq = [
      true, true, true, true, false, // 반전1
      true, true, // 반전2
      false, // 반전3
      true, true, // 반전4
      false, // 반전5
    ];
    run(engine, seq);

    expect(engine.getReversals()).toHaveLength(5);

    // 5개 - 버림 2개 = 3개(홀수) → 가장 오래된 것 하나 더 버려 2개 사용
    const used = engine.getReversals().slice(3);
    const expected =
      Math.round((used.reduce((a, b) => a + b, 0) / used.length) * 10) / 10;

    expect(engine.getThreshold()).toBe(expected);
  });
});

describe('집계', () => {
  it('시행 수와 정답 수를 센다', () => {
    const engine = new StaircaseEngine(440);

    run(engine, [true, false, true, false]);

    const state = engine.getState();
    expect(state.totalTrials).toBe(4);
    expect(state.correctCount).toBe(2);
    expect(engine.getAccuracy()).toBeCloseTo(0.5);
  });

  it('시행 전 정답률은 0이다', () => {
    expect(new StaircaseEngine(440).getAccuracy()).toBe(0);
  });

  it('reset이 반전 기록까지 초기화한다', () => {
    const engine = new StaircaseEngine(440);
    run(engine, [true, true, true, true, false, true, true]);
    expect(engine.getReversals().length).toBeGreaterThan(0);

    engine.reset(262);

    const state = engine.getState();
    expect(state.centsDifference).toBe(STAIRCASE.INITIAL_CENTS);
    expect(state.totalTrials).toBe(0);
    expect(state.baseFreq).toBe(262);
    expect(state.reversalCount).toBe(0);
    expect(state.currentStep).toBe(STEP_LARGE);
    expect(engine.getReversals()).toEqual([]);
    expect(engine.getThreshold()).toBeNull();
    expect(engine.getClampCount()).toBe(0);
  });

  it('reset 후 방향 추적이 새로 시작된다', () => {
    const engine = new StaircaseEngine(440);
    run(engine, [true, true]); // 하강 방향 기록됨

    engine.reset(440);
    run(engine, [false]); // 상승 — 직전 세션의 하강과 이어지면 안 됨

    expect(engine.getState().reversalCount).toBe(0);
  });
});

describe('목표 주파수 계산', () => {
  it('현재 격차만큼 위 또는 아래로 이동한다', () => {
    const engine = new StaircaseEngine(440);
    const { isHigher, targetFreq, centsDifference } = engine.prepareRound();

    const expected = centsToFreq(
      440,
      isHigher ? centsDifference : -centsDifference,
    );
    expect(targetFreq).toBeCloseTo(expected, 6);
  });

  it('양방향이 모두 나온다', () => {
    const engine = new StaircaseEngine(440);
    const directions = new Set<boolean>();

    for (let i = 0; i < 100; i++) directions.add(engine.prepareRound().isHigher);

    expect(directions.size).toBe(2);
  });

  it('재생 한도를 벗어나면 클램프하고 횟수를 센다', () => {
    // __DEV__에서 클램프마다 로그를 남기는 것이 정상 동작이므로 출력만 억제한다
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    // 하한(200Hz) 기준음 + 큰 격차면 아래쪽이 한도를 벗어난다
    const engine = new StaircaseEngine(AUDIO.FREQ_MIN_HZ);

    let sawLowDirection = false;
    for (let i = 0; i < 50; i++) {
      const round = engine.prepareRound();
      if (!round.isHigher) {
        sawLowDirection = true;
        expect(round.targetFreq).toBe(AUDIO.FREQ_MIN_HZ);
      }
      expect(round.targetFreq).toBeGreaterThanOrEqual(AUDIO.FREQ_MIN_HZ);
      expect(round.targetFreq).toBeLessThanOrEqual(AUDIO.FREQ_MAX_HZ);
    }

    expect(sawLowDirection).toBe(true);
    expect(engine.getClampCount()).toBeGreaterThan(0);
    log.mockRestore();
  });
});

describe('피드백 메시지', () => {
  it('정답이면 실제 방향을 알려준다', () => {
    const engine = new StaircaseEngine(440);
    const { isHigher } = engine.prepareRound();
    const result = engine.submitAnswer(isHigher);

    expect(result.isCorrect).toBe(true);
    expect(result.message).toContain(isHigher ? '높았습니다' : '낮았습니다');
  });

  it('오답이면 정답 방향을 알려준다', () => {
    const engine = new StaircaseEngine(440);
    const { isHigher } = engine.prepareRound();
    const result = engine.submitAnswer(!isHigher);

    expect(result.isCorrect).toBe(false);
    expect(result.message).toContain(isHigher ? '높았습니다' : '낮았습니다');
  });
});
