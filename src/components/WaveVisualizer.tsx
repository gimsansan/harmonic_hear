/**
 * 파형 시각화 컴포넌트 (Phase 3 — Animated API 기반)
 *
 * 소리 A(시안)와 소리 B(오렌지)를 개별 애니메이션으로 표현합니다.
 * Phase 5에서 Skia GPU 가속 버전으로 교체 예정.
 */

import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, Animated, Easing } from 'react-native';
import { COLORS, RADIUS, SPACING, FONT_SIZE } from '../constants/theme';

interface WaveVisualizerProps {
  activeSound: 'none' | 'A' | 'B';
}

export default function WaveVisualizer({ activeSound }: WaveVisualizerProps) {
  const waveAnimA = useRef(new Animated.Value(0)).current;
  const waveAnimB = useRef(new Animated.Value(0)).current;
  const animRefA = useRef<Animated.CompositeAnimation | null>(null);
  const animRefB = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (activeSound === 'A') {
      animRefA.current?.stop();
      animRefA.current = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnimA, {
            toValue: 1,
            duration: 250,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(waveAnimA, {
            toValue: 0,
            duration: 250,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ]),
        { iterations: 4 },
      );
      animRefA.current.start(() => {
        waveAnimA.setValue(0);
      });
    } else if (activeSound === 'B') {
      animRefB.current?.stop();
      animRefB.current = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnimB, {
            toValue: 1,
            duration: 250,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(waveAnimB, {
            toValue: 0,
            duration: 250,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ]),
        { iterations: 4 },
      );
      animRefB.current.start(() => {
        waveAnimB.setValue(0);
      });
    }
  }, [activeSound, waveAnimA, waveAnimB]);

  return (
    <View style={styles.canvas}>
      {/* 소리 A */}
      <View style={styles.soundBox}>
        <Text style={styles.soundLabel}>소리 A (기준)</Text>
        <View style={styles.barsRow}>
          {[0.6, 0.9, 1.2, 0.9, 0.6].map((baseScale, i) => (
            <Animated.View
              key={`a-${i}`}
              style={[
                styles.bar,
                {
                  backgroundColor:
                    activeSound === 'A' ? COLORS.primary : COLORS.waveInactive,
                  transform: [
                    {
                      scaleY: waveAnimA.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, baseScale],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
        <Text
          style={[
            styles.freqLabel,
            activeSound === 'A' && { color: COLORS.primary },
          ]}
        >
          440 Hz
        </Text>
      </View>

      {/* 구분선 */}
      <View style={styles.divider} />

      {/* 소리 B */}
      <View style={styles.soundBox}>
        <Text style={styles.soundLabel}>소리 B (비교)</Text>
        <View style={styles.barsRow}>
          {[0.6, 0.9, 1.2, 0.9, 0.6].map((baseScale, i) => (
            <Animated.View
              key={`b-${i}`}
              style={[
                styles.bar,
                {
                  backgroundColor:
                    activeSound === 'B'
                      ? COLORS.secondary
                      : COLORS.waveInactive,
                  transform: [
                    {
                      scaleY: waveAnimB.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, baseScale],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
        <Text
          style={[
            styles.freqLabel,
            activeSound === 'B' && { color: COLORS.secondary },
          ]}
        >
          ? Hz
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    height: 180,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
  },
  soundBox: {
    alignItems: 'center',
    flex: 1,
  },
  soundLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 80,
    gap: 6,
  },
  bar: {
    width: 8,
    height: 60,
    borderRadius: 4,
  },
  freqLabel: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.sm,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: COLORS.border,
  },
});
