/**
 * 세션 관리자 (§4.3)
 *
 * 평가(Assessment) / 훈련(Training) 이원화 프로토콜 관리.
 *
 * | 구분         | 평가 (Assessment)              | 훈련 (Training)               |
 * |-------------|-------------------------------|-------------------------------|
 * | 소리 원천    | 목표 음고 직접 녹음 (shift = 0)  | 기준 음고 녹음 + 키존 보간     |
 * | 음고 제어    | 파일 1:1 매핑                   | 최근접 샘플 + detune(cent)     |
 * | 포먼트 변형  | 0% (리샘플링 없음)              | ±100 cent 이내 (허용 오차)     |
 */

import { StaircaseEngine, StaircaseState, TrialResult } from './StaircaseEngine';
import { ASSESSMENT, AUDIO } from '../constants/theme';

export type SessionMode = 'assessment' | 'training';

export interface SessionConfig {
  /** 세션 모드 */
  mode: SessionMode;
  /** 기준 주파수 (Hz) */
  baseFreq: number;
  /** 사운드 모드 (wave/voice) */
  soundMode: 'wave' | 'voice';
}

export interface SessionResult {
  /** 세션 ID (타임스탬프 기반) */
  id: string;
  /** 세션 모드 */
  mode: SessionMode;
  /** 사운드 모드 */
  soundMode: 'wave' | 'voice';
  /** 기준 주파수 (Hz). 구버전 세션에는 없을 수 있음 */
  baseFreq?: number;
  /** 주파수 클램프 발생 횟수. 구버전 세션에는 없을 수 있음 */
  clampCount?: number;
  /** 시작 시간 */
  startedAt: number;
  /** 종료 시간 */
  endedAt: number;
  /** 총 시행 수 */
  totalTrials: number;
  /** 정답 수 */
  correctCount: number;
  /** 정답률 (0~1) */
  accuracy: number;
  /**
   * 반전 기반 변별 역치 (cent).
   * 세션의 **대표 지표**입니다. 반전이 부족하면 null.
   * 구버전 세션에는 없을 수 있음.
   */
  thresholdCents?: number | null;
  /** 반전이 일어난 지점의 cent 값들. 구버전 세션에는 없을 수 있음 */
  reversals?: number[];
  /**
   * 최소 달성 cent 격차 (보조 지표).
   * 극단값이라 운에 흔들립니다. 대표 지표로 쓰지 마세요 — `thresholdCents`를 쓰십시오.
   */
  minCentsAchieved: number;
  /** 최종 cent 격차 */
  finalCents: number;
  /** 각 시행별 기록 */
  trials: TrialRecord[];
}

export interface TrialRecord {
  /** 시행 번호 (1-indexed) */
  trialNumber: number;
  /** 정답 여부 */
  isCorrect: boolean;
  /**
   * 반응 시간 (밀리초).
   * 자극 재생이 끝나 답변이 가능해진 시점부터 측정합니다.
   * 측정 시작 전에 답변이 들어온 경우 0.
   */
  reactionTimeMs: number;
  /** 이 시행에서 '다시 듣기'를 누른 횟수. 구버전 세션에는 없을 수 있음 */
  replayCount?: number;
  /** 해당 시행의 cent 격차 */
  centsDifference: number;
  /** B가 높았는지 */
  isHigher: boolean;
  /** 타임스탬프 */
  timestamp: number;
}

export class SessionManager {
  private config: SessionConfig;
  private staircaseEngine: StaircaseEngine;
  private startedAt: number = 0;
  private trials: TrialRecord[] = [];
  private minCentsAchieved: number;
  /** 답변 가능 시점(= B 재생 종료)의 타임스탬프. 0이면 아직 열리지 않음 */
  private responseWindowOpenedAt: number = 0;
  /** 현재 라운드에서 '다시 듣기'를 누른 횟수 */
  private replayCount: number = 0;
  private isActive: boolean = false;

  constructor(config?: Partial<SessionConfig>) {
    this.config = {
      mode: config?.mode ?? 'training',
      baseFreq: config?.baseFreq ?? AUDIO.BASE_FREQ,
      soundMode: config?.soundMode ?? 'wave',
    };

    this.staircaseEngine = new StaircaseEngine(this.config.baseFreq);
    this.minCentsAchieved = this.staircaseEngine.getState().centsDifference;
  }

  /**
   * 세션을 시작합니다.
   */
  startSession(): void {
    this.startedAt = Date.now();
    this.trials = [];
    this.isActive = true;
    this.responseWindowOpenedAt = 0;
    this.replayCount = 0;
    this.staircaseEngine.reset(this.config.baseFreq);
    this.minCentsAchieved = this.staircaseEngine.getState().centsDifference;
  }

  /**
   * 새 라운드를 준비합니다. (B의 방향을 새로 추첨)
   *
   * 반응 시간 측정은 여기서 시작하지 않습니다.
   * 자극 재생이 끝난 뒤 `openResponseWindow()`가 호출되는 시점부터 잽니다.
   */
  prepareRound(): StaircaseState {
    this.responseWindowOpenedAt = 0;
    this.replayCount = 0;
    return this.staircaseEngine.prepareRound();
  }

  /**
   * 답변 가능 시점을 표시합니다. (= A→B 재생이 끝나 답변 버튼이 활성화될 때)
   * 이 시점부터 반응 시간을 측정합니다.
   *
   * '다시 듣기'로 재재생한 경우에도 마지막 재생 종료 시점 기준으로 갱신됩니다.
   */
  openResponseWindow(): void {
    this.responseWindowOpenedAt = Date.now();
  }

  /**
   * 현재 라운드의 '다시 듣기' 횟수를 1 증가시킵니다.
   * 방향(정답)은 바뀌지 않습니다.
   */
  countReplay(): void {
    this.replayCount += 1;
  }

  /**
   * 진행 중이던 라운드를 폐기합니다. (앱 이탈·통화 등으로 자극을 놓친 경우)
   *
   * 시행으로 기록되지 않습니다. 답변을 받기 전 상태로 되돌릴 뿐입니다.
   */
  abortRound(): void {
    this.responseWindowOpenedAt = 0;
    this.replayCount = 0;
  }

  /**
   * 평가 세션이 종료 조건에 도달했는지 반환합니다. (§P1-2)
   *
   * 훈련 모드는 항상 false — 사용자가 원할 때까지 계속합니다.
   * 평가 모드는 세션마다 조건이 같아야 결과를 비교할 수 있으므로,
   * 반전 목표에 도달하거나 최대 시행 수를 채우면 자동으로 끝냅니다.
   */
  shouldAutoEnd(): boolean {
    if (this.config.mode !== 'assessment') return false;

    const state = this.staircaseEngine.getState();
    return (
      state.reversalCount >= ASSESSMENT.TARGET_REVERSALS ||
      state.totalTrials >= ASSESSMENT.MAX_TRIALS
    );
  }

  /**
   * 답변을 제출합니다.
   * 반응 시간을 자동 측정합니다.
   */
  submitAnswer(userThinksHigher: boolean): TrialResult {
    const now = Date.now();
    const reactionTimeMs =
      this.responseWindowOpenedAt > 0 ? now - this.responseWindowOpenedAt : 0;
    const currentState = this.staircaseEngine.getState();
    const result = this.staircaseEngine.submitAnswer(userThinksHigher);

    // 시행 기록 추가
    this.trials.push({
      trialNumber: this.trials.length + 1,
      isCorrect: result.isCorrect,
      reactionTimeMs,
      replayCount: this.replayCount,
      centsDifference: currentState.centsDifference,
      isHigher: currentState.isHigher,
      timestamp: now,
    });

    // 답변이 끝난 라운드이므로 측정 창을 닫는다 (중복 제출 방지 보조)
    this.responseWindowOpenedAt = 0;

    // 최소 cent 갱신
    if (result.newState.centsDifference < this.minCentsAchieved) {
      this.minCentsAchieved = result.newState.centsDifference;
    }

    return result;
  }

  /**
   * 세션을 종료하고 결과를 반환합니다.
   */
  endSession(): SessionResult {
    this.isActive = false;
    const state = this.staircaseEngine.getState();

    return {
      id: `session_${this.startedAt}`,
      mode: this.config.mode,
      soundMode: this.config.soundMode,
      baseFreq: this.config.baseFreq,
      clampCount: this.staircaseEngine.getClampCount(),
      startedAt: this.startedAt,
      endedAt: Date.now(),
      totalTrials: state.totalTrials,
      correctCount: state.correctCount,
      accuracy: this.staircaseEngine.getAccuracy(),
      thresholdCents: this.staircaseEngine.getThreshold(),
      reversals: [...this.staircaseEngine.getReversals()],
      minCentsAchieved: this.minCentsAchieved,
      finalCents: state.centsDifference,
      trials: [...this.trials],
    };
  }

  /**
   * 현재 세션이 활성 상태인지 반환합니다.
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * 현재 Staircase 상태를 반환합니다.
   */
  getStaircaseState(): Readonly<StaircaseState> {
    return this.staircaseEngine.getState();
  }

  /**
   * 현재 세션 설정을 반환합니다.
   */
  getConfig(): Readonly<SessionConfig> {
    return { ...this.config };
  }

  /**
   * 세션 설정을 업데이트합니다 (세션 비활성 상태에서만).
   */
  updateConfig(partial: Partial<SessionConfig>): void {
    if (this.isActive) {
      console.warn('[SessionManager] 활성 세션 중에는 설정을 변경할 수 없습니다.');
      return;
    }
    this.config = { ...this.config, ...partial };
  }
}
