/**
 * 세션 결과 화면 (P2-2)
 *
 * 기존에는 시스템 팝업(Alert)으로 한 줄 요약만 띄웠습니다.
 * 정보 전달도 동기부여도 약해서 전용 화면으로 분리했습니다.
 *
 * 직전 세션과 비교해 "좋아졌는지"를 먼저 보여주는 것이 핵심입니다.
 *
 * 클리니컬 리디자인: 역치 히어로만 짙은 네이비로 두어 결론을 한 점에 모읍니다.
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
import Feather from '@expo/vector-icons/Feather';

import { TrainingStorage } from '../src/storage/TrainingStorage';
import type { SessionResult } from '../src/training/SessionManager';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  RADIUS,
  STAIRCASE,
  MIN_TOUCH_TARGET,
  ELEVATION,
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
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowTile}>
            <Feather name="check" size={17} color={COLORS.primary} />
          </View>
          <Text style={styles.eyebrow}>
            {session.mode === 'assessment' ? '평가 완료' : '훈련 완료'}
          </Text>
        </View>

        {/* 대표 지표 */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>들을 수 있는 최소 차이</Text>
          {threshold != null ? (
            <>
              <Text style={styles.heroValue}>{threshold}</Text>
              <Text style={styles.heroUnit}>음 높이 차이 · 낮을수록 정밀</Text>
            </>
          ) : (
            <>
              <Text style={styles.heroValueMuted}>—</Text>
              <Text style={styles.heroUnit}>
                난이도 바뀐 횟수 {reversalCount}회{'\n'}
                {STAIRCASE.THRESHOLD_MIN_REVERSALS}회부터 산출됩니다{'\n'}
                세션은 저장됐지만, 최소 차이는 아직 계산 전입니다
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
            <Text
              style={[
                styles.deltaText,
                delta > 0 ? styles.deltaTextGood : styles.deltaTextFlat,
              ]}
            >
              {delta > 0
                ? `지난번보다 ${delta} 좋아졌습니다`
                : delta < 0
                  ? `지난번보다 ${Math.abs(delta)} 높습니다`
                  : '지난번과 같습니다'}
            </Text>
            <Text
              style={[
                styles.deltaSub,
                delta > 0 ? styles.deltaTextGood : styles.deltaTextFlat,
              ]}
            >
              지난 기록 {priorThreshold}
            </Text>
          </View>
        )}

        {/* 세부 지표 */}
        <View style={styles.grid}>
          <View style={styles.cell}>
            <Text style={styles.cellValue}>{session.totalTrials}</Text>
            <Text style={styles.cellLabel}>문항</Text>
          </View>
          <View style={styles.cell}>
            <Text style={[styles.cellValue, styles.cellValueAccent]}>
              {accuracy}%
            </Text>
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
                난이도 바뀐 횟수 {reversalCount}회 · 전환 지점{' '}
                {session.reversals?.join(', ')}
              </Text>
            )}
          </View>
        )}

        <Text style={styles.note}>
          정답률은 참고용입니다. 이 훈련은 찍어도 절반은 맞기 때문에,
          성장은 <Text style={styles.emphasis}>들을 수 있는 최소 차이</Text>로 보는 편이 정확합니다.
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
  content: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.xxl, paddingBottom: 40 },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  eyebrowTile: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm - 1,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroCard: {
    backgroundColor: COLORS.ink,
    borderRadius: RADIUS.xxxl,
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
  },
  heroLabel: {
    color: COLORS.inkMuted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  heroValue: {
    color: COLORS.inkText,
    fontSize: 58,
    fontWeight: '800',
    lineHeight: 64,
    marginTop: SPACING.xs + 2,
  },
  heroValueMuted: {
    color: COLORS.inkAxis,
    fontSize: 58,
    fontWeight: '800',
    lineHeight: 64,
    marginTop: SPACING.xs + 2,
  },
  heroUnit: {
    color: COLORS.inkMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 19,
  },
  deltaCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.lg - 1,
    paddingHorizontal: 18,
    marginTop: SPACING.lg,
    borderWidth: 1,
  },
  deltaGood: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successAccent,
  },
  deltaFlat: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  deltaText: {
    flexShrink: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  deltaSub: {
    fontSize: FONT_SIZE.xs + 1,
  },
  deltaTextGood: { color: COLORS.success },
  deltaTextFlat: { color: COLORS.textMuted },
  grid: {
    flexDirection: 'row',
    marginTop: SPACING.md - 2,
    gap: SPACING.sm + 2,
  },
  cell: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl - 1,
    paddingVertical: SPACING.lg - 1,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cellValue: {
    color: COLORS.text,
    fontSize: FONT_SIZE.title,
    fontWeight: '800',
  },
  cellValueAccent: { color: COLORS.primary },
  cellLabel: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
  },
  trackCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl - 1,
    padding: SPACING.lg - 1,
    marginTop: SPACING.md - 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trackTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  trackLine: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    letterSpacing: 0.3,
    lineHeight: 20,
  },
  trackHint: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.xs,
    marginTop: 9,
  },
  note: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.xs + 1,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  emphasis: { color: COLORS.primary, fontWeight: '700' },
  primaryButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg + 1,
    height: 54,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: ELEVATION.raised,
  },
  primaryButtonText: {
    color: COLORS.onPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  subRow: {
    flexDirection: 'row',
    gap: SPACING.sm + 2,
    marginTop: SPACING.sm + 2,
  },
  subButton: {
    flex: 1,
    height: 48,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subButtonText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});
