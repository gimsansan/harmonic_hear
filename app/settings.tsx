/**
 * 설정 및 정보 화면 (Phase 6)
 *
 * 기준 음고 설정, 저장소 데이터 초기화, 앱 정보 및 고지 문구 안내
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { TrainingStorage } from '../src/storage/TrainingStorage';
import { AppSettingsStorage } from '../src/storage/AppSettingsStorage';
import { setHapticsEnabled } from '../src/utils/haptics';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  RADIUS,
  REFERENCE_PRESETS,
  type ReferencePitchPreset,
} from '../src/constants/theme';

const PRESET_ORDER: ReferencePitchPreset[] = ['standard', 'mid', 'low'];

export default function SettingsScreen() {
  const router = useRouter();
  const [referencePreset, setReferencePreset] =
    useState<ReferencePitchPreset>('standard');
  const [haptics, setHaptics] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await AppSettingsStorage.getReferencePitchPreset();
      const hapticsOn = await AppSettingsStorage.getHapticsEnabled();
      if (!cancelled) {
        setReferencePreset(stored);
        setHaptics(hapticsOn);
        setHapticsEnabled(hapticsOn);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleHaptics = useCallback(async (value: boolean) => {
    setHaptics(value);
    setHapticsEnabled(value);
    await AppSettingsStorage.setHapticsEnabled(value);
  }, []);

  const handleReplayOnboarding = useCallback(async () => {
    await AppSettingsStorage.setOnboardingDone(false);
    router.push('/onboarding');
  }, [router]);

  const handleSelectPreset = useCallback(async (preset: ReferencePitchPreset) => {
    setReferencePreset(preset);
    await AppSettingsStorage.setReferencePitchPreset(preset);
  }, []);

  const handleClearData = () => {
    Alert.alert(
      '데이터 초기화',
      '저장된 모든 훈련 세션 및 최고 기록이 삭제됩니다. 정말 초기화하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            await TrainingStorage.clearAll();
            Alert.alert('완료', '모든 훈련 데이터가 초기화되었습니다.');
          },
        },
      ],
    );
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
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정 및 정보</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 오디오 설정 구역 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>오디오 설정</Text>

          <Text style={styles.itemTitle}>기준 음고 (Reference Pitch)</Text>
          <Text style={styles.presetHint}>
            훈련 기준음. 고역 프리셋은 제공하지 않습니다.
          </Text>

          {PRESET_ORDER.map((key) => {
            const preset = REFERENCE_PRESETS[key];
            const selected = referencePreset === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.presetRow, selected && styles.presetRowSelected]}
                onPress={() => handleSelectPreset(key)}
                activeOpacity={0.7}
              >
                <View>
                  <Text
                    style={[
                      styles.presetLabel,
                      selected && styles.presetLabelSelected,
                    ]}
                  >
                    {preset.label}
                  </Text>
                  <Text style={styles.itemSubtitle}>{preset.hz} Hz</Text>
                </View>
                {selected ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>선택됨</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleReplayOnboarding}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="볼륨 맞추기 안내 다시 보기"
          >
            <View style={styles.flexBody}>
              <Text style={styles.itemTitle}>볼륨 맞추기 안내 다시 보기</Text>
              <Text style={styles.itemSubtitle}>
                기준음을 들으며 편안한 크기로 맞춥니다
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 피드백 구역 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>피드백</Text>

          <View style={styles.settingItem}>
            <View style={styles.flexBody}>
              <Text style={styles.itemTitle}>진동 피드백</Text>
              <Text style={styles.itemSubtitle}>
                정답·오답을 진동으로도 알려 줍니다
              </Text>
            </View>
            <Switch
              value={haptics}
              onValueChange={handleToggleHaptics}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.text}
              accessibilityLabel="진동 피드백"
            />
          </View>
        </View>

        {/* 데이터 관리 구역 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>데이터 관리</Text>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearData}
            activeOpacity={0.8}
          >
            <Text style={styles.dangerButtonText}>🗑️ 훈련 데이터 전체 초기화</Text>
          </TouchableOpacity>
        </View>

        {/* 앱 정보 & 고지사항 */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>앱 정보 & 안내</Text>

          <View style={styles.infoCard}>
            <Text style={styles.appName}>HarmoniTune (하모니튠)</Text>
            <Text style={styles.appVersion}>
              버전 {Constants.expoConfig?.version ?? '1.0.0'}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.disclaimerTitle}>⚠️ 중요 고지 사항</Text>
            <Text style={styles.disclaimerText}>
              본 애플리케이션은 의료기기가 아닙니다. 청각 질환의 진단, 치료, 예방
              목적으로 사용할 수 없으며, 인공와우 및 보청기 착용자를 포함한 일반
              사용자의 음고 인지 감각 훈련과 음악 감상 웰니스를 보조하기 위한
              디지털 소프트웨어입니다.
            </Text>
          </View>
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
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  presetHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginBottom: SPACING.sm,
  },
  presetRow: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  presetLabel: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  presetLabelSelected: {
    color: COLORS.primary,
  },
  settingItem: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  flexBody: { flex: 1, paddingRight: SPACING.md },
  chevron: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xxl,
  },
  itemTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemSubtitle: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  badge: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  dangerButton: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  dangerButtonText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  appName: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  appVersion: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  disclaimerTitle: {
    color: COLORS.secondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  disclaimerText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    lineHeight: 18,
  },
});
