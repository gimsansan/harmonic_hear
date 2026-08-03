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
import { AUDIO } from '../constants/theme';

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
  /** 최소 달성 cent 격차 */
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
  /** 반응 시간 (밀리초) */
  reactionTimeMs: number;
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
  private roundStartTime: number = 0;
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
    this.staircaseEngine.reset(this.config.baseFreq);
    this.minCentsAchieved = this.staircaseEngine.getState().centsDifference;
  }

  /**
   * 새 라운드를 준비합니다.
   * 반응 시간 측정을 시작합니다.
   */
  prepareRound(): StaircaseState {
    this.roundStartTime = Date.now();
    return this.staircaseEngine.prepareRound();
  }

  /**
   * 답변을 제출합니다.
   * 반응 시간을 자동 측정합니다.
   */
  submitAnswer(userThinksHigher: boolean): TrialResult {
    const reactionTimeMs = Date.now() - this.roundStartTime;
    const currentState = this.staircaseEngine.getState();
    const result = this.staircaseEngine.submitAnswer(userThinksHigher);

    // 시행 기록 추가
    this.trials.push({
      trialNumber: this.trials.length + 1,
      isCorrect: result.isCorrect,
      reactionTimeMs,
      centsDifference: currentState.centsDifference,
      isHigher: currentState.isHigher,
      timestamp: Date.now(),
    });

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
      startedAt: this.startedAt,
      endedAt: Date.now(),
      totalTrials: state.totalTrials,
      correctCount: state.correctCount,
      accuracy: this.staircaseEngine.getAccuracy(),
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
