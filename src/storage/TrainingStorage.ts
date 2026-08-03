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

export class TrainingStorage {
  /**
   * 세션 결과를 저장합니다.
   */
  static async saveSession(session: SessionResult): Promise<void> {
    try {
      const existing = await this.getAllSessions();
      existing.push(session);
      await AsyncStorage.setItem(
        STORAGE_KEYS.SESSIONS,
        JSON.stringify(existing),
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
    } catch (e) {
      console.error('[TrainingStorage] 세션 저장 실패:', e);
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
   */
  static async getStats(): Promise<{
    totalSessions: number;
    totalTrials: number;
    overallAccuracy: number;
    bestMinCents: number | null;
    averageReactionMs: number | null;
  }> {
    const sessions = await this.getAllSessions();

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalTrials: 0,
        overallAccuracy: 0,
        bestMinCents: null,
        averageReactionMs: null,
      };
    }

    const totalTrials = sessions.reduce((sum, s) => sum + s.totalTrials, 0);
    const totalCorrect = sessions.reduce((sum, s) => sum + s.correctCount, 0);
    const bestMinCents = Math.min(...sessions.map((s) => s.minCentsAchieved));

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
      bestMinCents,
      averageReactionMs,
    };
  }
}
