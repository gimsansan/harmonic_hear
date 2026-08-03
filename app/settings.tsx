/**
 * 설정 및 정보 화면 (Phase 6)
 *
 * 기준 음고 설정, 저장소 데이터 초기화, 앱 정보 및 고지 문구 안내
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { TrainingStorage } from '../src/storage/TrainingStorage';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../src/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();

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

          <View style={styles.settingItem}>
            <View>
              <Text style={styles.itemTitle}>기준 음고 (Reference Pitch)</Text>
              <Text style={styles.itemSubtitle}>A4 = 440 Hz (표준 규격)</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>440 Hz</Text>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View>
              <Text style={styles.itemTitle}>기본 오디오 모드</Text>
              <Text style={styles.itemSubtitle}>Sine Wave / Formant Synthesis</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>WebAudio DSP</Text>
            </View>
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
            <Text style={styles.appVersion}>버전 1.0.0 (Phase 6)</Text>

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
  settingItem: {
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
