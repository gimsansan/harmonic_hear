/**
 * 적응형 계단법 난이도 엔진 (§6)
 *
 * 청각·정신물리학 실험에서 **표준·매우 흔한** 적응 절차입니다.
 * (연속 정답 시 하강, 오답 시 상승하는 전환형 계단법)
 *
 * 규칙:
 * - 기준음: 생성 시 전달된 baseFreq (기본 A4 440Hz)
 * - 연속 2회 정답 → 격차 10 cent 감소 (최소 10 cent)
 * - 오답 → 연속 정답 수 리셋 + 격차 10 cent 증가 (최대 300 cent)
 * - targetFreq는 AUDIO 재생 한도로 클램프 (안전망)
 */

import { STAIRCASE, AUDIO } from '../constants/theme';
import { centsToFreq, clampFreq } from '../audio/pitchUtils';

export interface StaircaseState {
  /** 현재 cent 격차 */
  centsDifference: number;
  /** 연속 정답 수 */
  streak: number;
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

  constructor(baseFreq: number = AUDIO.BASE_FREQ) {
    this.state = {
      centsDifference: STAIRCASE.INITIAL_CENTS,
      streak: 0,
      isHigher: true,
      totalTrials: 0,
      correctCount: 0,
      targetFreq: baseFreq,
      baseFreq,
    };
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
    const isCorrect = userThinksHigher === this.state.isHigher;
    const newTotalTrials = this.state.totalTrials + 1;

    let newStreak: number;
    let newCents: number;
    let message: string;

    if (isCorrect) {
      newStreak = this.state.streak + 1;
      const newCorrectCount = this.state.correctCount + 1;

      // 연속 2회 정답 → 격차 감소 (난이도 상승)
      if (newStreak >= STAIRCASE.STREAK_THRESHOLD) {
        newCents = Math.max(
          STAIRCASE.MIN_CENTS,
          this.state.centsDifference - STAIRCASE.STEP_DOWN,
        );
      } else {
        newCents = this.state.centsDifference;
      }

      message = `🎉 정답! B 소리가 음정차이 ${this.state.centsDifference}만큼 더 ${
        this.state.isHigher ? '높았습니다' : '낮았습니다'
      }.`;

      this.state = {
        ...this.state,
        streak: newStreak >= STAIRCASE.STREAK_THRESHOLD ? 0 : newStreak,
        centsDifference: newCents,
        totalTrials: newTotalTrials,
        correctCount: newCorrectCount,
      };
    } else {
      // 오답 → streak 리셋 + 격차 증가 (난이도 완화)
      newStreak = 0;
      newCents = Math.min(
        STAIRCASE.MAX_CENTS,
        this.state.centsDifference + STAIRCASE.STEP_UP,
      );

      message = `아쉽네요! B 소리가 더 ${
        this.state.isHigher ? '높았습니다' : '낮았습니다'
      }. 소리를 다시 느껴보세요.`;

      this.state = {
        ...this.state,
        streak: newStreak,
        centsDifference: newCents,
        totalTrials: newTotalTrials,
      };
    }

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
    this.state = {
      centsDifference: STAIRCASE.INITIAL_CENTS,
      streak: 0,
      isHigher: true,
      totalTrials: 0,
      correctCount: 0,
      targetFreq: baseFreq,
      baseFreq,
    };
  }

  /**
   * 현재 정답률을 반환합니다.
   */
  getAccuracy(): number {
    if (this.state.totalTrials === 0) return 0;
    return this.state.correctCount / this.state.totalTrials;
  }
}
