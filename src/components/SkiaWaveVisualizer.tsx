/**
 * Skia GPU 가속 파형 시각화
 *
 * 3·4단계 수정 사항:
 * - P3-4 A/B가 같은 애니메이션 값을 공유해 함께 움직이던 문제 → 개별 구동
 * - P3-5 캔버스 폭이 244px로 고정돼 넓은 화면에서 좁게 보이던 문제 → 반응형
 * - P5-1 `useDerivedValue`를 `.map()` 안에서 호출하던 훅 규칙 위반 → WaveBar로 추출
 * - P3-6 B 주파수가 답변 후에도 `? Hz`였던 문제 → 정답 공개 시 실제 값 표시
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Text, useWindowDimensions } from 'react-native';
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
  type SharedValue,
} from 'react-native-reanimated';
import { AUDIO, COLORS, RADIUS, SPACING, FONT_SIZE } from '../constants/theme';

interface SkiaWaveVisualizerProps {
  activeSound: 'none' | 'A' | 'B';
  /** 소리 A(기준) 주파수 라벨 (Hz) */
  baseFreq?: number;
  /** 소리 B(비교) 주파수. 정답 공개 전에는 넘기지 않는다 */
  targetFreq?: number | null;
}

const CANVAS_HEIGHT = 110;
const BAR_COUNT = 7;
const BAR_WIDTH = 8;
const BAR_GAP = 6;
const MAX_BAR_HEIGHT = 78;
const MIN_BAR_HEIGHT = 12;
const BASE_SCALES = [0.35, 0.55, 0.75, 1.0, 0.75, 0.55, 0.35];

const GROUP_WIDTH = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP;

/**
 * 막대 하나.
 *
 * 훅을 컴포넌트 최상위에서만 호출하기 위해 분리했습니다.
 * `.map()` 콜백 안에서 훅을 부르면 배열 길이가 바뀌는 순간 깨집니다.
 */
function WaveBar({
  x,
  centerY,
  baseScale,
  progress,
  colors,
}: {
  x: number;
  centerY: number;
  baseScale: number;
  progress: SharedValue<number>;
  colors: string[];
}) {
  const height = useDerivedValue(() => {
    const active = MIN_BAR_HEIGHT + (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) * baseScale;
    return MIN_BAR_HEIGHT + (active - MIN_BAR_HEIGHT) * progress.value;
  }, [progress]);

  const y = useDerivedValue(() => centerY - height.value / 2, [height]);

  return (
    <RoundedRect x={x} y={y} width={BAR_WIDTH} height={height} r={BAR_WIDTH / 2}>
      <LinearGradient
        start={vec(x, 0)}
        end={vec(x, CANVAS_HEIGHT)}
        colors={colors}
      />
    </RoundedRect>
  );
}

export default function SkiaWaveVisualizer({
  activeSound,
  baseFreq = AUDIO.BASE_FREQ,
  targetFreq = null,
}: Readonly<SkiaWaveVisualizerProps>) {
  const { width: screenWidth } = useWindowDimensions();
  // 훈련 화면의 좌우 여백(SPACING.xl)을 뺀 폭에 맞춘다
  const canvasWidth = Math.max(GROUP_WIDTH * 2 + 60, screenWidth - SPACING.xl * 2);

  // A와 B를 각각 구동한다 — 하나를 공유하면 반대쪽 막대도 같이 움직인다
  const progressA = useSharedValue(0);
  const progressB = useSharedValue(0);

  useEffect(() => {
    const pulse = (value: SharedValue<number>) => {
      value.value = 0;
      value.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
          withTiming(0, { duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        ),
        4,
        false,
      );
    };
    const settle = (value: SharedValue<number>) => {
      cancelAnimation(value);
      value.value = withTiming(0, { duration: 200 });
    };

    if (activeSound === 'A') {
      pulse(progressA);
      settle(progressB);
    } else if (activeSound === 'B') {
      settle(progressA);
      pulse(progressB);
    } else {
      settle(progressA);
      settle(progressB);
    }
  }, [activeSound, progressA, progressB]);

  const isActiveA = activeSound === 'A';
  const isActiveB = activeSound === 'B';

  const colorsA = isActiveA
    ? [COLORS.primary, '#0091EA']
    : [COLORS.waveInactive, '#252840'];
  const colorsB = isActiveB
    ? [COLORS.secondary, '#FF3D00']
    : [COLORS.waveInactive, '#252840'];

  const leftGroupX = (canvasWidth / 2 - GROUP_WIDTH) / 2;
  const rightGroupX = canvasWidth / 2 + (canvasWidth / 2 - GROUP_WIDTH) / 2;
  const centerY = CANVAS_HEIGHT / 2;

  const centsLabel =
    targetFreq != null
      ? `${Math.round(targetFreq)} Hz`
      : '? Hz';

  return (
    <View style={styles.wrapper}>
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

      <Canvas style={{ width: canvasWidth, height: CANVAS_HEIGHT }}>
        <Group>
          {BASE_SCALES.map((scale, i) => (
            <WaveBar
              key={`a-${i}`}
              x={leftGroupX + i * (BAR_WIDTH + BAR_GAP)}
              centerY={centerY}
              baseScale={scale}
              progress={progressA}
              colors={colorsA}
            />
          ))}
        </Group>

        <Group>
          {BASE_SCALES.map((scale, i) => (
            <WaveBar
              key={`b-${i}`}
              x={rightGroupX + i * (BAR_WIDTH + BAR_GAP)}
              centerY={centerY}
              baseScale={scale}
              progress={progressB}
              colors={colorsB}
            />
          ))}
        </Group>
      </Canvas>

      <View style={styles.freqRow}>
        <Text style={[styles.freqText, isActiveA && { color: COLORS.primary }]}>
          {baseFreq} Hz
        </Text>
        <Text style={[styles.freqText, isActiveB && { color: COLORS.secondary }]}>
          {centsLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    paddingVertical: SPACING.md,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.xs,
  },
  labelBox: { flex: 1, alignItems: 'center' },
  label: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  freqRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.xs,
  },
  freqText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    fontWeight: '500',
  },
});
