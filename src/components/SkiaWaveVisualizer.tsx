/**
 * Skia GPU 가속 파형 시각화
 *
 * 3·4단계 수정 사항:
 * - P3-4 A/B가 같은 애니메이션 값을 공유해 함께 움직이던 문제 → 개별 구동
 * - P3-5 캔버스 폭이 244px로 고정돼 넓은 화면에서 좁게 보이던 문제 → 반응형
 * - P5-1 `useDerivedValue`를 `.map()` 안에서 호출하던 훅 규칙 위반 → WaveBar로 추출
 * - P3-6 B 주파수가 답변 후에도 `? Hz`였던 문제 → 정답 공개 시 실제 값 표시
 *
 * 클리니컬 리디자인: 하나의 넓은 캔버스 → **가운데 선으로 나뉜 두 칸**.
 * A와 B가 물리적으로 분리돼 있어야 "지금 어느 쪽이 울리는지"가 즉시 읽힙니다.
 * 막대는 그라데이션을 빼고 단색으로, 계측기 눈금에 가깝게 정리했습니다.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Canvas, RoundedRect } from '@shopify/react-native-skia';
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

const CANVAS_HEIGHT = 52;
const BAR_COUNT = 7;
const BAR_WIDTH = 6;
const BAR_GAP = 5;
const MAX_BAR_HEIGHT = 48;
const MIN_BAR_HEIGHT = 18;
/** 쉬는 상태에서도 살짝 들쭉날쭉해야 "정지 화면"이 아니라 파형으로 읽힌다 */
const BASE_SCALES = [0.35, 0.75, 0.5, 1.0, 0.55, 0.85, 0.4];

const CANVAS_WIDTH = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP;

/**
 * 막대 하나.
 *
 * 훅을 컴포넌트 최상위에서만 호출하기 위해 분리했습니다.
 * `.map()` 콜백 안에서 훅을 부르면 배열 길이가 바뀌는 순간 깨집니다.
 */
function WaveBar({
  x,
  baseScale,
  progress,
  color,
}: {
  x: number;
  baseScale: number;
  progress: SharedValue<number>;
  color: string;
}) {
  const height = useDerivedValue(() => {
    const active = MIN_BAR_HEIGHT + (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) * baseScale;
    return MIN_BAR_HEIGHT + (active - MIN_BAR_HEIGHT) * progress.value;
  }, [progress]);

  // 바닥을 맞춰 위로 자란다 (디자인의 align-items:flex-end)
  const y = useDerivedValue(() => CANVAS_HEIGHT - height.value, [height]);

  return (
    <RoundedRect
      x={x}
      y={y}
      width={BAR_WIDTH}
      height={height}
      r={BAR_WIDTH / 2}
      color={color}
    />
  );
}

/** 소리 한쪽의 칸 — 라벨 / 막대 / 주파수 */
function SoundColumn({
  label,
  freqLabel,
  isActive,
  progress,
  activeColor,
  activeTextColor,
  divider,
}: {
  label: string;
  freqLabel: string;
  isActive: boolean;
  progress: SharedValue<number>;
  activeColor: string;
  activeTextColor: string;
  divider?: boolean;
}) {
  const barColor = isActive ? activeColor : COLORS.waveInactive;

  return (
    <View style={[styles.column, divider && styles.columnDivider]}>
      <Text
        style={[
          styles.label,
          isActive && { color: activeTextColor, fontWeight: '700' },
        ]}
      >
        {label}
      </Text>

      <Canvas style={styles.canvas}>
        {BASE_SCALES.map((scale, i) => (
          <WaveBar
            key={i}
            x={i * (BAR_WIDTH + BAR_GAP)}
            baseScale={scale}
            progress={progress}
            color={barColor}
          />
        ))}
      </Canvas>

      <Text
        style={[styles.freqText, isActive && { color: activeTextColor }]}
        numberOfLines={1}
      >
        {freqLabel}
      </Text>
    </View>
  );
}

export default function SkiaWaveVisualizer({
  activeSound,
  baseFreq = AUDIO.BASE_FREQ,
  targetFreq = null,
}: Readonly<SkiaWaveVisualizerProps>) {
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

  return (
    <View style={styles.card}>
      <SoundColumn
        label="소리 A (기준)"
        freqLabel={`${baseFreq} Hz`}
        isActive={activeSound === 'A'}
        progress={progressA}
        activeColor={COLORS.primary}
        activeTextColor={COLORS.primary}
      />
      <SoundColumn
        label="소리 B (비교)"
        freqLabel={targetFreq != null ? `${Math.round(targetFreq)} Hz` : '? Hz'}
        isActive={activeSound === 'B'}
        progress={progressB}
        activeColor={COLORS.secondary}
        activeTextColor={COLORS.secondaryText}
        divider
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl + 2,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 18,
    paddingHorizontal: SPACING.lg,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.lg - 2,
  },
  columnDivider: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.borderSoft,
  },
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  },
  label: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  freqText: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
});
