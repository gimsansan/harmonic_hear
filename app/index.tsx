import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { AppSettingsStorage } from '../src/storage/AppSettingsStorage';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  RADIUS,
  MIN_TOUCH_TARGET,
} from '../src/constants/theme';

export default function HomeScreen() {
  const router = useRouter();

  /** 훈련 진입 — 첫 실행이면 볼륨 맞추기 안내를 먼저 보여준다 (P2-1) */
  const handleStartTraining = useCallback(async () => {
    const done = await AppSettingsStorage.getOnboardingDone();
    router.push(done ? '/training' : '/onboarding');
  }, [router]);

  // 첫 진입 시 미리 확인해 두어 탭 반응이 느려지지 않게 한다
  useFocusEffect(
    useCallback(() => {
      void AppSettingsStorage.getOnboardingDone();
    }, []),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 로고 영역 */}
        <View style={styles.logoSection}>
          <Text style={styles.logoEmoji}>🎵</Text>
          <Text style={styles.appName}>HarmoniTune</Text>
          <Text style={styles.appNameKr}>하모니 튠</Text>
          <Text style={styles.tagline}>
            음고 인지 감각 훈련 · 음악 청취 웰니스
          </Text>
        </View>

        {/* 메인 훈련 카드 */}
        <View style={styles.cardSection}>
          <TouchableOpacity
            style={styles.mainCard}
            onPress={handleStartTraining}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="음고 감각 적응 훈련 시작"
          >
            <View style={styles.cardIconRow}>
              <Text style={styles.cardIcon}>🎧</Text>
            </View>
            <Text style={styles.cardTitle}>음고 감각 적응 훈련</Text>
            <Text style={styles.cardDesc}>
              두 소리의 높낮이 차이를 구별하는{'\n'}감각 훈련을 시작합니다
            </Text>
            <View style={styles.startBadge}>
              <Text style={styles.startBadgeText}>훈련 시작 →</Text>
            </View>
          </TouchableOpacity>

          {/* 서브 카드 (통계 & 설정) */}
          <View style={styles.subGrid}>
            <TouchableOpacity
              style={styles.subCard}
              onPress={() => router.push('/stats')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="훈련 통계 보기"
            >
              <Text style={styles.subCardIcon}>📊</Text>
              <Text style={styles.subCardTitle}>훈련 통계</Text>
              <Text style={styles.subCardDesc}>누적 성과 & 기록</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.subCard}
              onPress={() => router.push('/settings')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="설정 및 정보"
            >
              <Text style={styles.subCardIcon}>⚙️</Text>
              <Text style={styles.subCardTitle}>설정 및 정보</Text>
              <Text style={styles.subCardDesc}>앱 환경 & 안내</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 하단 고지 문구 */}
        <View style={styles.disclaimerSection}>
          <Text style={styles.disclaimer}>
            본 앱은 의료기기가 아닙니다. 질병의 진단·치료·예방 목적으로 사용할 수
            없으며, 청각 보조 기기 착용자의 음악 감상 경험을 향상시키는 디지털
            웰니스 콘텐츠입니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    minHeight: '100%',
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  logoEmoji: {
    fontSize: 56,
    marginBottom: SPACING.xs,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 1.5,
  },
  appNameKr: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 4,
  },
  tagline: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textDisabled,
    marginTop: SPACING.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardSection: {
    marginVertical: SPACING.md,
  },
  mainCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    // 메인 동선임을 시각적으로 구분 (P3-11)
    borderColor: COLORS.primary,
    marginBottom: SPACING.md,
  },
  cardIconRow: {
    marginBottom: SPACING.sm,
  },
  cardIcon: {
    fontSize: 40,
  },
  cardTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  cardDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  startBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  startBadgeText: {
    color: COLORS.onPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
  subGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subCardIcon: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  subCardTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  subCardDesc: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  disclaimerSection: {
    paddingVertical: SPACING.md,
  },
  disclaimer: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textDisabled,
    textAlign: 'center',
    lineHeight: 17,
  },
});
