/**
 * 역치 추이 그래프 (P2-3)
 *
 * Skia로 그리는 간단한 선그래프. 세션별 변별 역치의 변화를 보여줍니다.
 * "내가 늘고 있다"는 시각적 증거가 이런 훈련 앱의 핵심 동기부여 장치입니다.
 *
 * cent는 낮을수록 좋으므로 **위로 갈수록 낮은 값**이 되도록 y축을 뒤집습니다.
 * (그래프가 우상향하면 좋아지는 것으로 읽히게)
 */

import React from 'react';
import { StyleSheet, View, Text, useWindowDimensions } from 'react-native';
import { Canvas, Path, Circle, Skia } from '@shopify/react-native-skia';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

interface ThresholdChartProps {
  /** 시간순(오래된 → 최근) 역치 값 */
  values: number[];
}

const CHART_HEIGHT = 140;
const PADDING_X = 16;
const PADDING_Y = 20;

export default function ThresholdChart({ values }: ThresholdChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  // 화면 폭에 맞춘다 (좌우 여백 20 × 2 + 카드 안쪽 여백 16 × 2)
  const chartWidth = Math.max(240, screenWidth - SPACING.xl * 2 - PADDING_X * 2);

  if (values.length < 2) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>역치 추이</Text>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            세션이 2회 이상 쌓이면 변화를 그려 드립니다.
          </Text>
        </View>
      </View>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const innerW = chartWidth - PADDING_X * 2;
  const innerH = CHART_HEIGHT - PADDING_Y * 2;

  const points = values.map((v, i) => ({
    x: PADDING_X + (innerW * i) / (values.length - 1),
    // y축 뒤집기: 낮은 cent(=좋음)가 위로 간다
    y: PADDING_Y + (innerH * (v - min)) / range,
  }));

  const line = Skia.Path.Make();
  points.forEach((p, i) => {
    if (i === 0) line.moveTo(p.x, p.y);
    else line.lineTo(p.x, p.y);
  });

  const first = values[0];
  const last = values[values.length - 1];
  const improved = last < first;
  const delta = Math.abs(Math.round((last - first) * 10) / 10);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>역치 추이</Text>
        <Text
          style={[
            styles.delta,
            { color: improved ? COLORS.success : COLORS.textMuted },
          ]}
        >
          {delta === 0
            ? '변화 없음'
            : improved
              ? `↓ ${delta} 개선`
              : `↑ ${delta}`}
        </Text>
      </View>

      <Canvas style={{ width: chartWidth, height: CHART_HEIGHT }}>
        <Path
          path={line}
          style="stroke"
          strokeWidth={2.5}
          strokeCap="round"
          strokeJoin="round"
          color={COLORS.primary}
        />
        {points.map((p, i) => (
          <Circle
            key={`pt-${i}`}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 5 : 3}
            color={i === points.length - 1 ? COLORS.secondary : COLORS.primary}
          />
        ))}
      </Canvas>

      <View style={styles.axisRow}>
        <Text style={styles.axisText}>가장 오래된 {first}</Text>
        <Text style={styles.axisText}>최근 {last}</Text>
      </View>
      <Text style={styles.hint}>
        위로 갈수록 낮은 값(＝정밀)입니다. 선이 올라가면 좋아지는 중입니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: PADDING_X,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  delta: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  axisText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  hint: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.sm,
    lineHeight: 17,
  },
  emptyBox: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
});
