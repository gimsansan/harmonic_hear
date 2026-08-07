/**
 * 훈련 데이터 저장소 (AsyncStorage 기반)
 *
 * 세션 결과를 로컬에 저장하고 조회합니다.
 * 오프라인 전용 — 서버 동기화 없이 기기 로컬 데이터.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionResult } from '../training/SessionManager';

const STORAGE_KEYS = {
  SESSIONS: '@harmonitune/sessions',
  BEST_SCORE: '@harmonitune/best_score',
} as const;

/**
 * 보관할 최대 세션 수 (P5-4).
 *
 * 세션 하나에 시행별 기록이 통째로 들어가므로, 무제한으로 쌓이면
 * 단일 AsyncStorage 키가 수 MB까지 커져 읽기·쓰기가 눈에 띄게 느려집니다.
 * 오래된 것부터 버립니다.
 */
const MAX_STORED_SESSIONS = 200;

export class TrainingStorage {
  /**
   * 세션 결과를 저장합니다.
   *
   * @returns 저장에 성공했는지. 실패를 성공처럼 보이게 하면 안 되므로
   *          호출부에서 반드시 확인하십시오. (P5-5)
   */
  static async saveSession(session: SessionResult): Promise<boolean> {
    try {
      const existing = await this.getAllSessions();
      existing.push(session);

      // 무제한으로 쌓이면 단일 키가 수 MB가 되어 읽기·쓰기가 느려진다 (P5-4)
      const trimmed =
        existing.length > MAX_STORED_SESSIONS
          ? existing.slice(-MAX_STORED_SESSIONS)
          : existing;

      await AsyncStorage.setItem(
        STORAGE_KEYS.SESSIONS,
        JSON.stringify(trimmed),
      );

      // 최고 기록 갱신
      const currentBest = await this.getBestScore();
      if (
        currentBest === null ||
        session.minCentsAchieved < currentBest.minCentsAchieved
      ) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.BEST_SCORE,
          JSON.stringify({
            minCentsAchieved: session.minCentsAchieved,
            sessionId: session.id,
            achievedAt: session.endedAt,
          }),
        );
      }

      return true;
    } catch (e) {
      console.error('[TrainingStorage] 세션 저장 실패:', e);
      return false;
    }
  }

  /**
   * 모든 세션 결과를 조회합니다.
   */
  static async getAllSessions(): Promise<SessionResult[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (!raw) return [];
      return JSON.parse(raw) as SessionResult[];
    } catch (e) {
      console.error('[TrainingStorage] 세션 조회 실패:', e);
      return [];
    }
  }

  /**
   * 최근 N개 세션을 조회합니다.
   */
  static async getRecentSessions(count: number): Promise<SessionResult[]> {
    const all = await this.getAllSessions();
    return all.slice(-count);
  }

  /**
   * 최고 기록을 조회합니다.
   */
  static async getBestScore(): Promise<{
    minCentsAchieved: number;
    sessionId: string;
    achievedAt: number;
  } | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.BEST_SCORE);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error('[TrainingStorage] 최고 기록 조회 실패:', e);
      return null;
    }
  }

  /**
   * 모든 훈련 데이터를 초기화합니다.
   */
  static async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.SESSIONS,
        STORAGE_KEYS.BEST_SCORE,
      ]);
    } catch (e) {
      console.error('[TrainingStorage] 데이터 초기화 실패:', e);
    }
  }

  /**
   * 통계 요약을 반환합니다.
   *
   * 대표 지표는 `bestThresholdCents`(반전 기반 변별 역치)입니다.
   * `bestMinCents`는 극단값이라 운에 흔들리므로 보조 지표로만 두었습니다.
   */
  static async getStats(): Promise<{
    totalSessions: number;
    totalTrials: number;
    overallAccuracy: number;
    /** 역치를 산출한 세션 수 (반전이 충분했던 세션) */
    sessionsWithThreshold: number;
    /** 지금까지 기록 중 가장 낮은(=가장 좋은) 변별 역치 */
    bestThresholdCents: number | null;
    /** 가장 최근에 산출된 변별 역치 */
    latestThresholdCents: number | null;
    /** 보조 지표 — 도달한 최소 격차 */
    bestMinCents: number | null;
    averageReactionMs: number | null;
  }> {
    const sessions = await this.getAllSessions();

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalTrials: 0,
        overallAccuracy: 0,
        sessionsWithThreshold: 0,
        bestThresholdCents: null,
        latestThresholdCents: null,
        bestMinCents: null,
        averageReactionMs: null,
      };
    }

    const totalTrials = sessions.reduce((sum, s) => sum + s.totalTrials, 0);
    const totalCorrect = sessions.reduce((sum, s) => sum + s.correctCount, 0);
    const bestMinCents = Math.min(...sessions.map((s) => s.minCentsAchieved));

    // 역치 — 구버전 세션에는 필드가 없고, 반전이 부족했던 세션은 null이다
    const withThreshold = sessions.filter(
      (s): s is typeof s & { thresholdCents: number } =>
        typeof s.thresholdCents === 'number',
    );
    const bestThresholdCents =
      withThreshold.length > 0
        ? Math.min(...withThreshold.map((s) => s.thresholdCents))
        : null;
    const latestThresholdCents =
      withThreshold.length > 0
        ? withThreshold[withThreshold.length - 1].thresholdCents
        : null;

    // 전체 평균 반응 시간
    const allReactions = sessions.flatMap((s) =>
      s.trials.map((t) => t.reactionTimeMs),
    );
    const averageReactionMs =
      allReactions.length > 0
        ? allReactions.reduce((a, b) => a + b, 0) / allReactions.length
        : null;

    return {
      totalSessions: sessions.length,
      totalTrials,
      overallAccuracy: totalTrials > 0 ? totalCorrect / totalTrials : 0,
      sessionsWithThreshold: withThreshold.length,
      bestThresholdCents,
      latestThresholdCents,
      bestMinCents,
      averageReactionMs,
    };
  }
}
