/**
 * 훈련 통계 화면 (Phase 6)
 *
 * 세션별 누적 기록, 최소 cent 격차, 정답률 추이, 반응 시간 통계 조회
 *
 * 클리니컬 리디자인: 역치 하나를 짙은 히어로 카드로 올리고,
 * 나머지 지표는 그 아래 작은 타일로 내렸습니다.
 * 이전에는 카드 4개가 같은 크기라 "무엇을 봐야 하는지"가 없었습니다.
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
import Feather from '@expo/vector-icons/Feather';
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
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadData}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* 역치 추이 — 이 화면의 결론 (P2-3) */}
        <ThresholdChart
          values={[...recentSessions]
            .reverse() // 목록은 최근순이므로 그래프용으로 시간순 복원
            .map((s) => s.thresholdCents)
            .filter((v): v is number => typeof v === 'number')}
        />

        {/* 보조 지표 타일 */}
        <View style={styles.tileRow}>
          <View style={styles.tile}>
            <Text style={[styles.tileValue, styles.tileValueAccent]}>
              {stats?.bestThresholdCents != null
                ? `${stats.bestThresholdCents}`
                : '-'}
            </Text>
            <Text style={styles.tileLabel}>최고 역치</Text>
          </View>

          <View style={styles.tile}>
            <Text style={styles.tileValue}>
              {stats ? `${formatAccuracy(stats.overallAccuracy)}%` : '-'}
            </Text>
            <Text style={styles.tileLabel}>누적 정답률</Text>
          </View>

          <View style={styles.tile}>
            <Text style={styles.tileValue}>
              {stats?.averageReactionMs
                ? `${Math.round(stats.averageReactionMs)}`
                : '-'}
              {stats?.averageReactionMs ? (
                <Text style={styles.tileUnit}>ms</Text>
              ) : null}
            </Text>
            <Text style={styles.tileLabel}>평균 반응</Text>
          </View>
        </View>

        <Text style={styles.summaryLine}>
          총 {stats?.totalSessions ?? 0}세션 · {stats?.totalTrials ?? 0}시행
          {stats && stats.totalSessions > stats.sessionsWithThreshold
            ? ` · 역치 산출 ${stats.sessionsWithThreshold}세션`
            : ''}
        </Text>

        {/* 최근 세션 기록 */}
        <Text style={styles.sectionTitle}>최근 훈련 세션 (최대 10개)</Text>

        {recentSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bar-chart-2" size={40} color={COLORS.textMinimal} />
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
            const isAssessment = session.mode === 'assessment';

            return (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionModeRow}>
                    <Feather
                      name={isAssessment ? 'clipboard' : 'headphones'}
                      size={13}
                      color={COLORS.textMuted}
                    />
                    <Text style={styles.sessionMode}>
                      {isAssessment ? '평가' : '훈련'}
                    </Text>
                  </View>
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
                      style={[
                        styles.detailValue,
                        { color: COLORS.secondaryText },
                      ]}
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
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 60,
    paddingVertical: SPACING.xs,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.text,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  headerSpacer: { width: 60 },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  tileRow: {
    flexDirection: 'row',
    gap: 9,
  },
  tile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: 13,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  tileValue: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xxxl,
    fontWeight: '800',
  },
  tileValueAccent: {
    color: COLORS.primary,
  },
  tileUnit: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  tileLabel: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
  },
  summaryLine: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.xs + 1,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  emptyDesc: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 19,
  },
  startButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  startButtonText: {
    color: COLORS.onPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  sessionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md + 1,
    padding: 13,
    marginBottom: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  sessionModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  sessionMode: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  sessionDate: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.xs,
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.xs,
    marginBottom: 2,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
});
