/**
 * 세션 결과 화면 (P2-2)
 *
 * 기존에는 시스템 팝업(Alert)으로 한 줄 요약만 띄웠습니다.
 * 정보 전달도 동기부여도 약해서 전용 화면으로 분리했습니다.
 *
 * 직전 세션과 비교해 "좋아졌는지"를 먼저 보여주는 것이 핵심입니다.
 */

import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';

import { TrainingStorage } from '../src/storage/TrainingStorage';
import type { SessionResult } from '../src/training/SessionManager';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  RADIUS,
  STAIRCASE,
  MIN_TOUCH_TARGET,
} from '../src/constants/theme';

export default function ResultScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();

  const [session, setSession] = useState<SessionResult | null>(null);
  const [previous, setPrevious] = useState<SessionResult | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const all = await TrainingStorage.getAllSessions();
        if (cancelled || all.length === 0) return;

        const index = sessionId
          ? all.findIndex((s) => s.id === sessionId)
          : all.length - 1;
        const target = index >= 0 ? all[index] : all[all.length - 1];

        // 직전에 역치가 나온 세션을 비교 대상으로 삼는다
        const prior = all
          .slice(0, index >= 0 ? index : all.length - 1)
          .reverse()
          .find((s) => typeof s.thresholdCents === 'number');

        setSession(target);
        setPrevious(prior ?? null);
      })();
      return () => {
        cancelled = true;
      };
    }, [sessionId]),
  );

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>결과를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const accuracy = Math.round(session.accuracy * 100);
  const threshold = session.thresholdCents;
  const reversalCount = session.reversals?.length ?? 0;
  const priorThreshold = previous?.thresholdCents ?? null;

  const delta =
    threshold != null && priorThreshold != null
      ? Math.round((priorThreshold - threshold) * 10) / 10
      : null;

  const avgReaction =
    session.trials.length > 0
      ? Math.round(
          session.trials.reduce((a, t) => a + t.reactionTimeMs, 0) /
            session.trials.length,
        )
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>
          {session.mode === 'assessment' ? '📋 평가 완료' : '🏋️ 훈련 완료'}
        </Text>

        {/* 대표 지표 */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>변별 역치</Text>
          {threshold != null ? (
            <>
              <Text style={styles.heroValue}>{threshold}</Text>
              <Text style={styles.heroUnit}>cent · 낮을수록 정밀</Text>
            </>
          ) : (
            <>
              <Text style={styles.heroValueMuted}>—</Text>
              <Text style={styles.heroUnit}>
                난이도 방향 전환 {reversalCount}회{'\n'}
                {STAIRCASE.THRESHOLD_MIN_REVERSALS}회부터 산출됩니다
              </Text>
            </>
          )}
        </View>

        {/* 직전 대비 */}
        {delta !== null && (
          <View
            style={[
              styles.deltaCard,
              delta > 0 ? styles.deltaGood : styles.deltaFlat,
            ]}
          >
            <Text style={styles.deltaText}>
              {delta > 0
                ? `지난번보다 ${delta} 좋아졌습니다`
                : delta < 0
                  ? `지난번보다 ${Math.abs(delta)} 높습니다`
                  : '지난번과 같습니다'}
            </Text>
            <Text style={styles.deltaSub}>지난 기록 {priorThreshold}</Text>
          </View>
        )}

        {/* 세부 지표 */}
        <View style={styles.grid}>
          <View style={styles.cell}>
            <Text style={styles.cellValue}>{session.totalTrials}</Text>
            <Text style={styles.cellLabel}>시행</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.cellValue}>{accuracy}%</Text>
            <Text style={styles.cellLabel}>정답률</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.cellValue}>
              {avgReaction != null ? `${avgReaction}` : '-'}
            </Text>
            <Text style={styles.cellLabel}>평균 반응(ms)</Text>
          </View>
        </View>

        {/* 난이도 궤적 */}
        {session.trials.length > 0 && (
          <View style={styles.trackCard}>
            <Text style={styles.trackTitle}>난이도 궤적</Text>
            <Text style={styles.trackLine}>
              {session.trials.map((t) => t.centsDifference).join(' → ')}
            </Text>
            {reversalCount > 0 && (
              <Text style={styles.trackHint}>
                방향 전환 {reversalCount}회 · 전환 지점{' '}
                {session.reversals?.join(', ')}
              </Text>
            )}
          </View>
        )}

        <Text style={styles.note}>
          정답률은 참고용입니다. 이 훈련은 찍어도 절반은 맞기 때문에,
          성장은 <Text style={styles.emphasis}>변별 역치</Text>로 보는 편이 정확합니다.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/training')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="한 세션 더 하기"
        >
          <Text style={styles.primaryButtonText}>한 세션 더</Text>
        </TouchableOpacity>

        <View style={styles.subRow}>
          <TouchableOpacity
            style={styles.subButton}
            onPress={() => router.replace('/stats')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="통계 보기"
          >
            <Text style={styles.subButtonText}>통계 보기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.subButton}
            onPress={() => router.replace('/')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="홈으로"
          >
            <Text style={styles.subButtonText}>홈으로</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: FONT_SIZE.md },
  content: { padding: SPACING.xl, paddingBottom: 40 },
  eyebrow: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  heroLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.xs,
  },
  heroValue: {
    color: COLORS.primary,
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 62,
  },
  heroValueMuted: {
    color: COLORS.textDisabled,
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 62,
  },
  heroUnit: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 19,
  },
  deltaCard: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  deltaGood: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.success,
  },
  deltaFlat: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  deltaText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  deltaSub: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  cell: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cellValue: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
  },
  cellLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  trackCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trackTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  trackLine: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
  },
  trackHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs,
  },
  note: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
    marginTop: SPACING.lg,
  },
  emphasis: { color: COLORS.primary, fontWeight: '700' },
  primaryButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.onPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
  },
  subRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  subButton: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});
