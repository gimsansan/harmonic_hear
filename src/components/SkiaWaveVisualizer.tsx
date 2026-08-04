/**
 * Skia GPU 가속 파형 시각화 (Phase 5)
 *
 * @shopify/react-native-skia 기반 실시간 파형 렌더링.
 * Animated API 기반 WaveVisualizer를 대체합니다.
 *
 * 특징:
 * - GPU 가속 렌더링 (목표 60fps)
 * - 부드러운 그라디언트 파형 바
 * - 소리 A(시안) / B(오렌지) 개별 애니메이션
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import {
  Canvas,
  RoundedRect,
  LinearGradient,
  vec,
  Group,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  useDerivedValue,
  cancelAnimation,
} from 'react-native-reanimated';
import { AUDIO, COLORS, RADIUS, SPACING, FONT_SIZE } from '../constants/theme';

interface SkiaWaveVisualizerProps {
  activeSound: 'none' | 'A' | 'B';
  /** 소리 A(기준) 주파수 라벨 (Hz). 기본 AUDIO.BASE_FREQ */
  baseFreq?: number;
}

const CANVAS_HEIGHT = 180;
const BAR_COUNT = 7;
const BAR_WIDTH = 8;
const BAR_GAP = 6;
const MAX_BAR_HEIGHT = 90;
const MIN_BAR_HEIGHT = 12;
const BASE_SCALES = [0.35, 0.55, 0.75, 1.0, 0.75, 0.55, 0.35];

export default function SkiaWaveVisualizer({
  activeSound,
  baseFreq = AUDIO.BASE_FREQ,
}: SkiaWaveVisualizerProps) {
  const animProgress = useSharedValue(0);

  useEffect(() => {
    if (activeSound === 'A' || activeSound === 'B') {
      animProgress.value = 0;
      animProgress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
          withTiming(0, { duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        ),
        4,
        false,
      );
    } else {
      cancelAnimation(animProgress);
      animProgress.value = withTiming(0, { duration: 200 });
    }
  }, [activeSound, animProgress]);

  // 각 바의 높이 계산 (derived values)
  const barHeights = BASE_SCALES.map((baseScale, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDerivedValue(() => {
      const activeHeight = MIN_BAR_HEIGHT + (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) * baseScale;
      const idleHeight = MIN_BAR_HEIGHT;
      return idleHeight + (activeHeight - idleHeight) * animProgress.value;
    }, [animProgress]),
  );

  const isActiveA = activeSound === 'A';
  const isActiveB = activeSound === 'B';

  const colorsA = isActiveA
    ? ['#00E5FF', '#0091EA']
    : [COLORS.waveInactive, '#252840'];
  const colorsB = isActiveB
    ? ['#FF6D00', '#FF3D00']
    : [COLORS.waveInactive, '#252840'];

  // 바 그룹의 총 너비
  const groupWidth = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP;
  const canvasWidth = groupWidth * 2 + 60; // 양쪽 그룹 + 간격

  const leftGroupX = (canvasWidth / 2 - groupWidth) / 2;
  const rightGroupX = canvasWidth / 2 + (canvasWidth / 2 - groupWidth) / 2;
  const centerY = CANVAS_HEIGHT / 2;

  return (
    <View style={styles.canvas}>
      {/* 라벨 */}
      <View style={styles.labelsRow}>
        <View style={styles.labelBox}>
          <Text style={[styles.label, isActiveA && { color: COLORS.primary }]}>
            소리 A (기준)
          </Text>
        </View>
        <View style={styles.labelBox}>
          <Text style={[styles.label, isActiveB && { color: COLORS.secondary }]}>
            소리 B (비교)
          </Text>
        </View>
      </View>

      {/* Skia Canvas */}
      <Canvas style={{ width: canvasWidth, height: CANVAS_HEIGHT - 50, alignSelf: 'center' }}>
        {/* 소리 A 바 그룹 */}
        <Group>
          {BASE_SCALES.map((_, i) => {
            const x = leftGroupX + i * (BAR_WIDTH + BAR_GAP);
            const barH = barHeights[i];
            const y = useDerivedValue(() => centerY - 25 - barH.value / 2, [barH]);

            return (
              <Group key={`a-${i}`}>
                <RoundedRect
                  x={x}
                  y={y}
                  width={BAR_WIDTH}
                  height={barH}
                  r={BAR_WIDTH / 2}
                >
                  <LinearGradient
                    start={vec(x, 0)}
                    end={vec(x, CANVAS_HEIGHT)}
                    colors={colorsA}
                  />
                </RoundedRect>
              </Group>
            );
          })}
        </Group>

        {/* 소리 B 바 그룹 */}
        <Group>
          {BASE_SCALES.map((_, i) => {
            const x = rightGroupX + i * (BAR_WIDTH + BAR_GAP);
            const barH = barHeights[i];
            const y = useDerivedValue(() => centerY - 25 - barH.value / 2, [barH]);

            return (
              <Group key={`b-${i}`}>
                <RoundedRect
                  x={x}
                  y={y}
                  width={BAR_WIDTH}
                  height={barH}
                  r={BAR_WIDTH / 2}
                >
                  <LinearGradient
                    start={vec(x, 0)}
                    end={vec(x, CANVAS_HEIGHT)}
                    colors={colorsB}
                  />
                </RoundedRect>
              </Group>
            );
          })}
        </Group>
      </Canvas>

      {/* 주파수 표시 */}
      <View style={styles.freqRow}>
        <Text style={[styles.freqText, isActiveA && { color: COLORS.primary }]}>
          {baseFreq} Hz
        </Text>
        <Text style={[styles.freqText, isActiveB && { color: COLORS.secondary }]}>
          ? Hz
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    height: CANVAS_HEIGHT,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.md,
  },
  labelBox: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  freqRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: SPACING.sm,
  },
  freqText: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.xs,
    fontWeight: '500',
  },
});
