/**
 * 적응형 계단법 난이도 엔진 (§6)
 *
 * 청각·정신물리학 실험에서 **표준·매우 흔한** 적응 절차입니다.
 * (연속 정답 시 하강, 오답 시 상승하는 전환형 계단법 = 2-down-1-up)
 *
 * 규칙:
 * - 기준음: 생성 시 전달된 baseFreq (기본 A4 440Hz)
 * - 연속 2회 정답 → 격차 감소 (최소 10 cent)
 * - 오답 → 연속 정답 수 리셋 + 격차 증가 (최대 300 cent)
 * - 조정 폭은 **가변**: 반전이 쌓일수록 좁아진다 (STAIRCASE.STEP_SCHEDULE)
 * - targetFreq는 AUDIO 재생 한도로 클램프 (안전망)
 *
 * 반전(reversal)과 역치:
 * - 난이도가 하강하다 상승으로, 또는 그 반대로 **방향을 바꾼 지점**을 반전이라 한다.
 * - 반전 지점의 cent 값들을 모아 평균내면 **변별 역치**가 된다.
 *   2-down-1-up 절차는 이론적으로 70.7% 정답 지점에 수렴한다.
 * - 세션 중 도달한 최솟값(minCents)은 극단값이라 운에 흔들리지만,
 *   반전 평균은 여러 지점을 평균내므로 훨씬 안정적이다.
 */

import { STAIRCASE, AUDIO } from '../constants/theme';
import { centsToFreq, clampFreq } from '../audio/pitchUtils';

/** 난이도 이동 방향 */
type StepDirection = 'up' | 'down';

export interface StaircaseState {
  /** 현재 cent 격차 */
  centsDifference: number;
  /**
   * 화면 표시용 누적 연속 정답 수.
   * 오답에서만 0으로 리셋된다. (난이도 제어와 분리)
   */
  streak: number;
  /**
   * 난이도 하강 판정용 카운터.
   * STREAK_THRESHOLD에 도달하면 격차를 낮추고 0으로 리셋된다.
   */
  stepCounter: number;
  /** B 소리가 더 높은지 (현재 라운드) */
  isHigher: boolean;
  /** 총 시행 수 */
  totalTrials: number;
  /** 정답 수 */
  correctCount: number;
  /** B 소리의 주파수 (Hz) */
  targetFreq: number;
  /** 기준 주파수 (Hz) */
  baseFreq: number;
  /** 지금까지 발생한 반전 횟수 */
  reversalCount: number;
  /** 다음 조정에 적용될 폭 (cent) */
  currentStep: number;
}

export interface TrialResult {
  /** 정답 여부 */
  isCorrect: boolean;
  /** 피드백 메시지 */
  message: string;
  /** 업데이트된 상태 */
  newState: StaircaseState;
}

export class StaircaseEngine {
  private state: StaircaseState;
  /** 파일럿용: targetFreq 클램프 발생 횟수 */
  private clampCount = 0;
  /** 반전이 일어난 지점의 cent 값들 (시간순) */
  private reversals: number[] = [];
  /** 직전 난이도 이동 방향. 아직 움직인 적 없으면 null */
  private lastDirection: StepDirection | null = null;

  constructor(baseFreq: number = AUDIO.BASE_FREQ) {
    this.state = StaircaseEngine.initialState(baseFreq);
  }

  private static initialState(baseFreq: number): StaircaseState {
    return {
      centsDifference: STAIRCASE.INITIAL_CENTS,
      streak: 0,
      stepCounter: 0,
      isHigher: true,
      totalTrials: 0,
      correctCount: 0,
      targetFreq: baseFreq,
      baseFreq,
      reversalCount: 0,
      currentStep: StaircaseEngine.stepForReversals(0),
    };
  }

  /**
   * 반전 횟수에 대응하는 조정 폭을 구합니다.
   *
   * STEP_SCHEDULE에서 `fromReversal <= reversalCount`인 항목 중 마지막 값을 씁니다.
   */
  private static stepForReversals(reversalCount: number): number {
    // `as const` 때문에 리터럴 타입으로 좁혀지므로 number로 명시한다
    let step: number = STAIRCASE.STEP_SCHEDULE[0].step;
    for (const entry of STAIRCASE.STEP_SCHEDULE) {
      if (reversalCount >= entry.fromReversal) {
        step = entry.step;
      }
    }
    return step;
  }

  /**
   * 현재 상태를 반환합니다.
   */
  getState(): Readonly<StaircaseState> {
    return { ...this.state };
  }

  /**
   * 세션 내 주파수 클램프 발생 횟수를 반환합니다.
   */
  getClampCount(): number {
    return this.clampCount;
  }

  /**
   * 반전이 일어난 지점의 cent 값들을 반환합니다. (시간순)
   */
  getReversals(): readonly number[] {
    return [...this.reversals];
  }

  /**
   * 반전 기반 변별 역치(cent)를 반환합니다.
   *
   * 초기 THRESHOLD_DISCARD_REVERSALS개는 수렴 전 구간이라 버리고,
   * 남은 반전값의 평균을 씁니다. 상승·하강 반전이 균형을 이루도록 **짝수 개**만 사용합니다.
   *
   * @returns 역치(cent). 반전이 부족하면 null
   */
  getThreshold(): number | null {
    if (this.reversals.length < STAIRCASE.THRESHOLD_MIN_REVERSALS) {
      return null;
    }

    let used = this.reversals.slice(STAIRCASE.THRESHOLD_DISCARD_REVERSALS);
    if (used.length % 2 === 1) {
      // 가장 오래된 것을 하나 더 버려 짝수를 맞춘다
      used = used.slice(1);
    }
    if (used.length === 0) {
      return null;
    }

    const mean = used.reduce((a, b) => a + b, 0) / used.length;
    return Math.round(mean * 10) / 10;
  }

  /**
   * 새 라운드를 준비합니다.
   * B 소리의 방향(높음/낮음)을 랜덤으로 결정하고 목표 주파수를 계산합니다.
   *
   * @returns 업데이트된 상태
   */
  prepareRound(): StaircaseState {
    const isHigher = Math.random() > 0.5;
    const centsOffset = isHigher
      ? this.state.centsDifference
      : -this.state.centsDifference;
    const rawTarget = centsToFreq(this.state.baseFreq, centsOffset);
    const { clamped: targetFreq, wasOverLimit } = clampFreq(rawTarget);
    if (wasOverLimit) {
      this.clampCount += 1;
      if (__DEV__) {
        console.log(
          `[StaircaseEngine] freq clamped: ${rawTarget.toFixed(2)} → ${targetFreq}`,
        );
      }
    }

    this.state = {
      ...this.state,
      isHigher,
      targetFreq,
    };

    return this.getState();
  }

  /**
   * 사용자의 답변을 처리합니다.
   *
   * @param userThinksHigher - 사용자가 "B가 더 높다"고 답했는지
   * @returns 정답 여부, 피드백 메시지, 업데이트된 상태
   */
  submitAnswer(userThinksHigher: boolean): TrialResult {
    const prev = this.state;
    const isCorrect = userThinksHigher === prev.isHigher;
    const step = prev.currentStep;

    let nextCents = prev.centsDifference;
    let nextStreak: number;
    let nextStepCounter: number;
    let message: string;

    if (isCorrect) {
      nextStreak = prev.streak + 1;
      const counter = prev.stepCounter + 1;

      // 연속 2회 정답 → 격차 감소 (난이도 상승)
      if (counter >= STAIRCASE.STREAK_THRESHOLD) {
        nextCents = Math.max(STAIRCASE.MIN_CENTS, prev.centsDifference - step);
        nextStepCounter = 0;
      } else {
        nextStepCounter = counter;
      }

      message = `🎉 정답! B 소리가 음정차이 ${prev.centsDifference}만큼 더 ${
        prev.isHigher ? '높았습니다' : '낮았습니다'
      }.`;
    } else {
      // 오답 → 카운터 리셋 + 격차 증가 (난이도 완화)
      nextStreak = 0;
      nextStepCounter = 0;
      nextCents = Math.min(STAIRCASE.MAX_CENTS, prev.centsDifference + step);

      message = `아쉽네요! B 소리가 더 ${
        prev.isHigher ? '높았습니다' : '낮았습니다'
      }. 소리를 다시 느껴보세요.`;
    }

    // 반전 판정 — 격차가 실제로 움직였을 때만
    // (MIN/MAX에 걸려 값이 그대로면 방향이 바뀐 것으로 보지 않는다)
    if (nextCents !== prev.centsDifference) {
      const direction: StepDirection =
        nextCents < prev.centsDifference ? 'down' : 'up';

      if (this.lastDirection !== null && direction !== this.lastDirection) {
        // 방향이 바뀐 지점의 난이도를 기록한다
        this.reversals.push(prev.centsDifference);
      }
      this.lastDirection = direction;
    }

    const reversalCount = this.reversals.length;

    this.state = {
      ...prev,
      streak: nextStreak,
      stepCounter: nextStepCounter,
      centsDifference: nextCents,
      totalTrials: prev.totalTrials + 1,
      correctCount: prev.correctCount + (isCorrect ? 1 : 0),
      reversalCount,
      currentStep: StaircaseEngine.stepForReversals(reversalCount),
    };

    return {
      isCorrect,
      message,
      newState: this.getState(),
    };
  }

  /**
   * 상태를 초기화합니다.
   */
  reset(baseFreq: number = AUDIO.BASE_FREQ): void {
    this.clampCount = 0;
    this.reversals = [];
    this.lastDirection = null;
    this.state = StaircaseEngine.initialState(baseFreq);
  }

  /**
   * 현재 정답률을 반환합니다.
   */
  getAccuracy(): number {
    if (this.state.totalTrials === 0) return 0;
    return this.state.correctCount / this.state.totalTrials;
  }
}
