/**
 * 훈련 통계 화면 (Phase 6)
 *
 * 세션별 누적 기록, 최소 cent 격차, 정답률 추이, 반응 시간 통계 조회
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { TrainingStorage } from '../src/storage/TrainingStorage';
import type { SessionResult } from '../src/training/SessionManager';
import ThresholdChart from '../src/components/ThresholdChart';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  RADIUS,
  MIN_TOUCH_TARGET,
} from '../src/constants/theme';

// 헤더 뒤로가기 버튼의 최소 터치 영역
const BACK_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

interface StorageStats {
  totalSessions: number;
  totalTrials: number;
  overallAccuracy: number;
  sessionsWithThreshold: number;
  bestThresholdCents: number | null;
  latestThresholdCents: number | null;
  bestMinCents: number | null;
  averageReactionMs: number | null;
}

export default function StatsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<SessionResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const summaryStats = await TrainingStorage.getStats();
      const sessions = await TrainingStorage.getRecentSessions(10);
      setStats(summaryStats);
      setRecentSessions(sessions.reverse()); // 최근순 정렬
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const formatAccuracy = (acc: number) => Math.round(acc * 100);
  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(
      2,
      '0',
    )}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          hitSlop={BACK_HIT_SLOP}
        >
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>훈련 통계</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadData}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* 요약 카드 그리드 */}
        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.cardEmoji}>🏆</Text>
            <Text style={[styles.cardValue, { color: COLORS.primary }]}>
              {stats?.bestThresholdCents != null
                ? `${stats.bestThresholdCents}`
                : '-'}
            </Text>
            <Text style={styles.cardLabel}>변별 역치 (최고)</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEmoji}>📈</Text>
            <Text style={styles.cardValue}>
              {stats?.latestThresholdCents != null
                ? `${stats.latestThresholdCents}`
                : '-'}
            </Text>
            <Text style={styles.cardLabel}>최근 역치</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEmoji}>🎯</Text>
            <Text style={styles.cardValue}>
              {stats ? `${formatAccuracy(stats.overallAccuracy)}%` : '-'}
            </Text>
            <Text style={styles.cardLabel}>누적 정답률</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardEmoji}>⏱️</Text>
            <Text style={styles.cardValue}>
              {stats?.averageReactionMs
                ? `${Math.round(stats.averageReactionMs)} ms`
                : '-'}
            </Text>
            <Text style={styles.cardLabel}>평균 반응 시간</Text>
          </View>
        </View>

        {/* 역치 안내 + 누적 요약 */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryHint}>
            변별 역치는 구별할 수 있는 가장 작은 음정 차이입니다.{'\n'}
            <Text style={{ color: COLORS.primary }}>숫자가 작을수록 정밀</Text>
            하게 듣고 있다는 뜻입니다.
          </Text>
          <Text style={styles.summaryLine}>
            총 {stats?.totalSessions ?? 0}세션 · {stats?.totalTrials ?? 0}시행
            {stats && stats.totalSessions > stats.sessionsWithThreshold
              ? ` · 역치 산출 ${stats.sessionsWithThreshold}세션`
              : ''}
          </Text>
        </View>

        {/* 역치 추이 그래프 (P2-3) */}
        {recentSessions.length > 0 && (
          <ThresholdChart
            values={[...recentSessions]
              .reverse() // 목록은 최근순이므로 그래프용으로 시간순 복원
              .map((s) => s.thresholdCents)
              .filter((v): v is number => typeof v === 'number')}
          />
        )}

        {/* 최근 세션 기록 */}
        <Text style={styles.sectionTitle}>최근 훈련 세션 (최대 10개)</Text>

        {recentSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>저장된 훈련 기록이 없습니다</Text>
            <Text style={styles.emptyDesc}>
              &lsquo;음고 감각 적응 훈련&rsquo;을 진행한 후 세션을 저장해보세요.
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => router.push('/training')}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>훈련하러 가기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentSessions.map((session) => {
            const accuracyPct = Math.round(
              (session.correctCount / session.totalTrials) * 100,
            );
            const modeText =
              session.mode === 'assessment' ? '📋 평가' : '🏋️ 훈련';

            return (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionMode}>{modeText}</Text>
                  <Text style={styles.sessionDate}>
                    {formatTime(session.endedAt)}
                  </Text>
                </View>

                <View style={styles.sessionDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>시행 수</Text>
                    <Text style={styles.detailValue}>
                      {session.totalTrials}회
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>정답률</Text>
                    <Text style={[styles.detailValue, { color: COLORS.primary }]}>
                      {accuracyPct}%
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>변별 역치</Text>
                    <Text
                      style={[styles.detailValue, { color: COLORS.secondary }]}
                    >
                      {session.thresholdCents != null
                        ? session.thresholdCents
                        : '-'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    paddingVertical: SPACING.xs,
    paddingRight: SPACING.md,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  card: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  cardValue: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  cardLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  summaryBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  summaryLine: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  emptyDesc: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  startButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  sessionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sessionMode: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  sessionDate: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.xs,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginBottom: 2,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
});
