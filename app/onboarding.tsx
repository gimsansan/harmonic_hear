/**
 * 첫 실행 안내 — 볼륨 맞추기 (P2-1)
 *
 * 훈련 실패의 상당수는 실력이 아니라 "소리가 작아서"입니다.
 * 시작 전에 기준음을 들려주고 편안한 크기로 맞추게 합니다.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

import { AudioEngine } from '../src/audio/AudioEngine';
import { AppSettingsStorage } from '../src/storage/AppSettingsStorage';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  RADIUS,
  AUDIO,
  REFERENCE_PRESETS,
  MIN_TOUCH_TARGET,
} from '../src/constants/theme';

/** 볼륨 확인용 반복 재생 길이 (초) */
const CHECK_TONE_DURATION = 1.2;
const CHECK_TONE_GAP = 0.3;
const CHECK_TONE_COUNT = 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const [audioEngine] = useState(() => new AudioEngine());
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasHeard, setHasHeard] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    audioEngine.init();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      audioEngine.dispose();
    };
  }, [audioEngine]);

  const handlePlayCheckTone = useCallback(async () => {
    if (isPlaying) return;
    setIsPlaying(true);

    // 같은 음을 여러 번 들려주며 볼륨을 맞출 시간을 준다
    const tones = Array.from({ length: CHECK_TONE_COUNT }, (_, i) => ({
      freq: REFERENCE_PRESETS.standard.hz,
      offset: i * (CHECK_TONE_DURATION + CHECK_TONE_GAP),
      duration: CHECK_TONE_DURATION,
    }));

    const ok = await audioEngine.playSequence(tones, 'wave');
    if (!ok) {
      setIsPlaying(false);
      return;
    }

    const totalMs =
      CHECK_TONE_COUNT * (CHECK_TONE_DURATION + CHECK_TONE_GAP) * 1000;
    timerRef.current = setTimeout(() => {
      setIsPlaying(false);
      setHasHeard(true);
    }, totalMs);
  }, [audioEngine, isPlaying]);

  const handleDone = useCallback(async () => {
    await AppSettingsStorage.setOnboardingDone(true);
    router.replace('/training');
  }, [router]);

  const handleSkip = useCallback(async () => {
    await AppSettingsStorage.setOnboardingDone(true);
    router.replace('/');
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>시작 전에 소리를 맞춰 주세요</Text>
        <Text style={styles.subtitle}>
          이 훈련은 아주 작은 소리 차이를 듣는 연습입니다.{'\n'}
          볼륨이 맞지 않으면 실력과 무관하게 어려워집니다.
        </Text>

        <View style={styles.stepCard}>
          <Text style={styles.stepNumber}>1</Text>
          <View style={styles.stepBody}>
            <Text style={styles.stepTitle}>이어폰을 착용하세요</Text>
            <Text style={styles.stepDesc}>
              조용한 곳에서 이어폰을 쓰면 차이를 훨씬 잘 느낄 수 있습니다.
              스피커로도 가능하지만 주변 소음에 영향을 받습니다.
            </Text>
          </View>
        </View>

        <View style={styles.stepCard}>
          <Text style={styles.stepNumber}>2</Text>
          <View style={styles.stepBody}>
            <Text style={styles.stepTitle}>소리를 들으며 볼륨을 조절하세요</Text>
            <Text style={styles.stepDesc}>
              아래 버튼을 누르면 기준음이 네 번 반복됩니다.
              재생되는 동안 기기의 미디어 볼륨을 조절해
              <Text style={styles.emphasis}> 편안하게 들리는 크기</Text>로 맞춰 주세요.
            </Text>

            <TouchableOpacity
              style={[styles.toneButton, isPlaying && styles.toneButtonActive]}
              onPress={handlePlayCheckTone}
              disabled={isPlaying}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="볼륨 확인용 기준음 재생"
              accessibilityState={{ disabled: isPlaying }}
            >
              <Text style={styles.toneButtonText}>
                {isPlaying ? '🔊 재생 중... 볼륨을 조절하세요' : '🔊 기준음 들어보기'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.toneHint}>
              기준음 {REFERENCE_PRESETS.standard.hz} Hz · {AUDIO.TONE_DURATION}초 톤
            </Text>
          </View>
        </View>

        <View style={styles.stepCard}>
          <Text style={styles.stepNumber}>3</Text>
          <View style={styles.stepBody}>
            <Text style={styles.stepTitle}>첫 문제는 쉽게 시작합니다</Text>
            <Text style={styles.stepDesc}>
              처음에는 차이가 뚜렷한 문제부터 나옵니다.
              맞히실수록 점점 미세해지니, 편하게 시작하셔도 됩니다.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, !hasHeard && styles.primaryButtonMuted]}
          onPress={handleDone}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="훈련 시작"
        >
          <Text style={styles.primaryButtonText}>
            {hasHeard ? '잘 들려요 · 훈련 시작' : '훈련 시작'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="건너뛰고 홈으로"
        >
          <Text style={styles.skipText}>건너뛰기</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          이 안내는 처음 한 번만 나옵니다.{'\n'}
          설정에서 다시 볼 수 있습니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl, paddingBottom: 40 },
  title: {
    color: COLORS.text,
    fontSize: FONT_SIZE.title,
    fontWeight: '800',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.lg,
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepNumber: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    width: 28,
  },
  stepBody: { flex: 1 },
  stepTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  stepDesc: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.md,
    lineHeight: 21,
  },
  emphasis: { color: COLORS.primary, fontWeight: '700' },
  toneButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.surfaceActive,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  toneButtonActive: { backgroundColor: COLORS.disabledButton },
  toneButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  toneHint: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonMuted: { opacity: 0.75 },
  primaryButtonText: {
    color: COLORS.onPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
  },
  skipButton: {
    marginTop: SPACING.md,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: { color: COLORS.textMuted, fontSize: FONT_SIZE.md },
  note: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 17,
  },
});
