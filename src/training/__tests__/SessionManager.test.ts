/**
 * SessionManager 회귀 테스트
 *
 * 지키는 결함 (docs/앱_개선_제안서.md §2):
 * - P0-2 다시 듣기 시 방향(정답) 유지 + replayCount 기록
 * - P0-3 반응 시간이 자극 재생 시간을 포함하지 않을 것
 */

import { SessionManager } from '../SessionManager';
import { ASSESSMENT, STAIRCASE } from '../../constants/theme';

/** 화면의 한 라운드 흐름을 그대로 흉내낸다. */
function playRound(sm: SessionManager) {
  const round = sm.prepareRound();
  sm.openResponseWindow(); // A→B 재생 완료 시점
  return round;
}

describe('P0-2 — 다시 듣기는 같은 문제를 재생한다', () => {
  it('방향(isHigher)과 목표 주파수가 유지된다', () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    const first = sm.prepareRound();
    // 다시 듣기: prepareRound를 부르지 않고 현재 상태를 그대로 재생
    sm.countReplay();
    const afterReplay = sm.getStaircaseState();
    sm.countReplay();
    const afterSecondReplay = sm.getStaircaseState();

    expect(afterReplay.isHigher).toBe(first.isHigher);
    expect(afterSecondReplay.isHigher).toBe(first.isHigher);
    expect(afterReplay.targetFreq).toBe(first.targetFreq);
    expect(afterSecondReplay.targetFreq).toBe(first.targetFreq);
  });

  it('새 문제는 방향이 실제로 재추첨된다', () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    const directions = new Set<boolean>();
    for (let i = 0; i < 100; i++) {
      directions.add(sm.prepareRound().isHigher);
    }

    // 100회면 한쪽만 나올 확률은 사실상 0
    expect(directions.size).toBe(2);
  });

  it('replayCount가 시행에 기록되고 라운드마다 초기화된다', () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    playRound(sm);
    sm.countReplay();
    sm.countReplay();
    sm.submitAnswer(true);

    playRound(sm); // 다시 듣기 없이 바로 답변
    sm.submitAnswer(true);

    const { trials } = sm.endSession();
    expect(trials[0].replayCount).toBe(2);
    expect(trials[1].replayCount).toBe(0);
  });

  it('다시 듣기는 시행 수를 늘리지 않는다', () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    playRound(sm);
    sm.countReplay();
    sm.countReplay();
    sm.countReplay();
    sm.submitAnswer(true);

    expect(sm.endSession().totalTrials).toBe(1);
  });
});

describe('P0-3 — 반응 시간은 답변 가능 시점부터 잰다', () => {
  const REAL_NOW = Date.now();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** Date.now()를 수동으로 진행시켜 시간 흐름을 통제한다. */
  function useFakeClock() {
    let current = REAL_NOW;
    jest.spyOn(Date, 'now').mockImplementation(() => current);
    return {
      advance: (ms: number) => {
        current += ms;
      },
    };
  }

  it('자극 재생 시간(2500ms)이 포함되지 않는다', () => {
    const clock = useFakeClock();
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    sm.prepareRound();
    clock.advance(2500); // A 1.0s + 갭 0.5s + B 1.0s
    sm.openResponseWindow();
    clock.advance(700); // 사용자 판단
    sm.submitAnswer(true);

    expect(sm.endSession().trials[0].reactionTimeMs).toBe(700);
  });

  it('다시 듣기를 하면 마지막 재생 종료 시점 기준으로 갱신된다', () => {
    const clock = useFakeClock();
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    sm.prepareRound();
    clock.advance(2500);
    sm.openResponseWindow();

    clock.advance(1000); // 고민하다가 다시 듣기
    sm.countReplay();
    clock.advance(2500); // 재재생
    sm.openResponseWindow();

    clock.advance(400);
    sm.submitAnswer(true);

    expect(sm.endSession().trials[0].reactionTimeMs).toBe(400);
  });

  it('prepareRound는 측정을 시작하지 않는다', () => {
    // 이 단언이 이 결함의 핵심 방어선이다.
    // prepareRound가 시계를 잡으면(수정 전 동작) 아래 값이 1200이 되고,
    // 실제 앱에서는 자극 재생 2500ms가 반응 시간에 그대로 섞여 들어간다.
    const clock = useFakeClock();
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    sm.prepareRound();
    clock.advance(1200);
    sm.submitAnswer(true); // openResponseWindow 없이

    expect(sm.endSession().trials[0].reactionTimeMs).toBe(0);
  });

  it('답변 후에는 측정 창이 닫힌다', () => {
    // 창이 열린 채 남으면 다음 라운드의 반응 시간이 이전 라운드 시점부터 잰다
    const clock = useFakeClock();
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    sm.prepareRound();
    sm.openResponseWindow();
    clock.advance(300);
    sm.submitAnswer(true);

    clock.advance(5000); // 다음 문제를 누르기까지 한참 쉼
    sm.prepareRound();
    clock.advance(2500); // 재생
    sm.submitAnswer(true); // openResponseWindow를 건너뛴 상황

    expect(sm.endSession().trials[1].reactionTimeMs).toBe(0);
  });
});

describe('P1-2 — 평가 세션 자동 종료', () => {
  it('훈련 모드는 자동 종료하지 않는다', () => {
    const sm = new SessionManager({ baseFreq: 440, mode: 'training' });
    sm.startSession();

    for (let i = 0; i < ASSESSMENT.MAX_TRIALS + 10; i++) {
      const round = playRound(sm);
      sm.submitAnswer(i % 3 === 0 ? !round.isHigher : round.isHigher);
      expect(sm.shouldAutoEnd()).toBe(false);
    }
  });

  it('평가 모드는 목표 반전 수에 도달하면 종료 조건이 된다', () => {
    const sm = new SessionManager({ baseFreq: 440, mode: 'assessment' });
    sm.startSession();

    let trials = 0;
    while (!sm.shouldAutoEnd() && trials < ASSESSMENT.MAX_TRIALS) {
      const round = playRound(sm);
      // 정답/오답을 번갈아 만들어 반전을 빠르게 쌓는다
      sm.submitAnswer(trials % 3 === 2 ? !round.isHigher : round.isHigher);
      trials += 1;
    }

    expect(sm.shouldAutoEnd()).toBe(true);
    expect(sm.getStaircaseState().reversalCount).toBeGreaterThanOrEqual(
      ASSESSMENT.TARGET_REVERSALS,
    );
  });

  it('반전이 안 쌓여도 최대 시행 수에서 종료 조건이 된다', () => {
    const sm = new SessionManager({ baseFreq: 440, mode: 'assessment' });
    sm.startSession();

    // 계속 오답 → MAX_CENTS에 붙어 반전이 생기지 않는다
    for (let i = 0; i < ASSESSMENT.MAX_TRIALS; i++) {
      const round = playRound(sm);
      sm.submitAnswer(!round.isHigher);
    }

    expect(sm.getStaircaseState().reversalCount).toBeLessThan(
      ASSESSMENT.TARGET_REVERSALS,
    );
    expect(sm.shouldAutoEnd()).toBe(true);
  });

  it('시작 직후에는 종료 조건이 아니다', () => {
    const sm = new SessionManager({ baseFreq: 440, mode: 'assessment' });
    sm.startSession();

    expect(sm.shouldAutoEnd()).toBe(false);
  });
});

describe('P0-6 — 라운드 폐기', () => {
  it('abortRound는 시행을 기록하지 않는다', () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    playRound(sm);
    sm.submitAnswer(true); // 정상 시행 1

    playRound(sm);
    sm.abortRound(); // 앱 이탈로 폐기

    playRound(sm);
    sm.submitAnswer(true); // 정상 시행 2

    const result = sm.endSession();
    expect(result.totalTrials).toBe(2);
    expect(result.trials).toHaveLength(2);
  });

  it('폐기 후 답변하면 반응 시간을 0으로 남긴다', () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    playRound(sm);
    sm.abortRound();
    sm.submitAnswer(true); // 측정 창이 닫힌 상태

    expect(sm.endSession().trials[0].reactionTimeMs).toBe(0);
  });

  it('폐기해도 다시 듣기 횟수가 다음 라운드로 새지 않는다', () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    playRound(sm);
    sm.countReplay();
    sm.countReplay();
    sm.abortRound();

    playRound(sm);
    sm.submitAnswer(true);

    expect(sm.endSession().trials[0].replayCount).toBe(0);
  });
});

describe('세션 기본 동작', () => {
  it('세션 결과가 시행 수·정답 수·정답률을 집계한다', () => {
    const sm = new SessionManager({ baseFreq: 440, mode: 'assessment' });
    sm.startSession();

    // 방향을 알고 있으므로 정답/오답을 의도적으로 만든다
    const r1 = playRound(sm);
    sm.submitAnswer(r1.isHigher); // 정답
    const r2 = playRound(sm);
    sm.submitAnswer(!r2.isHigher); // 오답
    const r3 = playRound(sm);
    sm.submitAnswer(r3.isHigher); // 정답

    const result = sm.endSession();
    expect(result.totalTrials).toBe(3);
    expect(result.correctCount).toBe(2);
    expect(result.accuracy).toBeCloseTo(2 / 3);
    expect(result.mode).toBe('assessment');
    expect(result.baseFreq).toBe(440);
  });

  it('minCentsAchieved는 세션 중 도달한 최솟값이다', () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    // 연속 정답 2회마다 현재 스텝만큼 하강 (초반 스텝 = STEP_SCHEDULE[0])
    for (let i = 0; i < 4; i++) {
      const round = playRound(sm);
      sm.submitAnswer(round.isHigher);
    }

    const result = sm.endSession();
    expect(result.minCentsAchieved).toBe(
      STAIRCASE.INITIAL_CENTS - STAIRCASE.STEP_SCHEDULE[0].step * 2,
    );
  });

  it('세션 결과에 반전 기반 역치가 담긴다 (P1-1)', () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    // StaircaseEngine 테스트와 같은 결정적 시나리오
    // 반전 [100, 150, 80, 100] → 앞 2개 버림 → [80, 100] → 역치 90
    const sequence = [
      true, true, true, true, false,
      true, true, true, true, false,
      true, true,
    ];
    sequence.forEach((correct) => {
      const round = playRound(sm);
      sm.submitAnswer(correct ? round.isHigher : !round.isHigher);
    });

    const result = sm.endSession();
    expect(result.reversals).toEqual([100, 150, 80, 100]);
    expect(result.thresholdCents).toBe(90);
  });

  it('반전이 부족한 짧은 세션은 역치가 null이다', () => {
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    for (let i = 0; i < 3; i++) {
      const round = playRound(sm);
      sm.submitAnswer(round.isHigher);
    }

    const result = sm.endSession();
    expect(result.thresholdCents).toBeNull();
    // 역치가 없어도 시행 기록은 남는다
    expect(result.totalTrials).toBe(3);
  });

  it('startSession이 이전 세션 상태를 완전히 초기화한다', () => {
    const sm = new SessionManager({ baseFreq: 440 });

    sm.startSession();
    playRound(sm);
    sm.countReplay();
    sm.submitAnswer(true);
    sm.endSession();

    sm.startSession();
    playRound(sm);
    sm.submitAnswer(true);

    const result = sm.endSession();
    expect(result.totalTrials).toBe(1);
    expect(result.trials).toHaveLength(1);
    expect(result.trials[0].replayCount).toBe(0);
  });

  it('활성 세션 중에는 설정을 바꾸지 않는다', () => {
    // 이 경로는 경고를 남기는 것이 정상 동작이므로 출력만 억제한다
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const sm = new SessionManager({ baseFreq: 440 });
    sm.startSession();

    sm.updateConfig({ baseFreq: 262 });

    expect(sm.getConfig().baseFreq).toBe(440);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
