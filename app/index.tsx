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
import Feather from '@expo/vector-icons/Feather';
import { AppSettingsStorage } from '../src/storage/AppSettingsStorage';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  RADIUS,
  MIN_TOUCH_TARGET,
  ELEVATION,
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
          <View style={styles.logoTile}>
            <Feather name="music" size={38} color={COLORS.primary} />
          </View>
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
            <View style={styles.cardIconTile}>
              <Feather name="headphones" size={26} color={COLORS.primary} />
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
              <Feather
                name="bar-chart-2"
                size={24}
                color={COLORS.primary}
                style={styles.subCardIcon}
              />
              <Text style={styles.subCardTitle}>훈련 통계</Text>
              <Text style={styles.subCardDesc}>누적 성과 &amp; 기록</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.subCard}
              onPress={() => router.push('/settings')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="설정 및 정보"
            >
              <Feather
                name="settings"
                size={24}
                color={COLORS.textMuted}
                style={styles.subCardIcon}
              />
              <Text style={styles.subCardTitle}>설정 및 정보</Text>
              <Text style={styles.subCardDesc}>앱 환경 &amp; 안내</Text>
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
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xxl,
    minHeight: '100%',
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: SPACING.xxxl,
    marginBottom: SPACING.lg,
  },
  logoTile: {
    width: 76,
    height: 76,
    borderRadius: RADIUS.xxxl,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 1,
  },
  appNameKr: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 5,
  },
  tagline: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textDisabled,
    marginTop: SPACING.md,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardSection: {
    marginVertical: SPACING.md,
    gap: SPACING.lg - 2,
  },
  mainCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxxl,
    paddingVertical: SPACING.xxl - 2,
    paddingHorizontal: SPACING.xl,
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1.5,
    // 메인 동선임을 시각적으로 구분 (P3-11)
    borderColor: COLORS.primary,
    elevation: ELEVATION.card,
  },
  cardIconTile: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg + 1,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg - 2,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs + 2,
  },
  cardDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 18,
  },
  startBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md + 1,
  },
  startBadgeText: {
    color: COLORS.onPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  subGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  subCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl + 2,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  subCardIcon: {
    marginBottom: SPACING.sm + 2,
  },
  subCardTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
  },
  subCardDesc: {
    fontSize: FONT_SIZE.xs + 1,
    color: COLORS.textDisabled,
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
