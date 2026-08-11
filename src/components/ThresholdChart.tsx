/**
 * 역치 추이 카드 (P2-3)
 *
 * Skia로 그리는 선그래프. 세션별 변별 역치의 변화를 보여줍니다.
 * "내가 늘고 있다"는 시각적 증거가 이런 훈련 앱의 핵심 동기부여 장치입니다.
 *
 * cent는 낮을수록 좋으므로 **위로 갈수록 낮은 값**이 되도록 y축을 뒤집습니다.
 * (그래프가 우상향하면 좋아지는 것으로 읽히게)
 *
 * 클리니컬 리디자인: 라이트 화면에서 이 카드만 짙은 네이비로 둡니다.
 * 통계 화면의 결론은 역치 하나뿐이라, 어두운 덩이 하나가 시선을 잡아 줍니다.
 * 최근 역치·개선 폭·설명을 카드 안으로 모아 여기저기 흩어지지 않게 했습니다.
 */

import React from 'react';
import { StyleSheet, View, Text, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Path,
  Circle,
  Skia,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';

interface ThresholdChartProps {
  /** 시간순(오래된 → 최근) 역치 값 */
  values: number[];
}

const CHART_HEIGHT = 96;
const CARD_PADDING = 18;
/** 통계 화면 스크롤 좌우 여백 (SPACING.lg) */
const SCREEN_PADDING = SPACING.lg;
const DOT_MARGIN = 8;

export default function ThresholdChart({ values }: ThresholdChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = Math.max(
    240,
    screenWidth - SCREEN_PADDING * 2 - CARD_PADDING * 2,
  );

  const latest = values.length > 0 ? values[values.length - 1] : null;

  if (values.length < 2) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>변별 역치 추이</Text>
        {latest != null ? (
          <View style={styles.valueRow}>
            <Text style={styles.value}>{latest}</Text>
            <Text style={styles.valueUnit}>음 높이 차이 · 최근</Text>
          </View>
        ) : null}
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            들을 수 있는 최소 차이가 나온 세션이 2회 이상이면 변화를 그려
            드립니다.
          </Text>
        </View>
      </View>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const innerW = chartWidth - DOT_MARGIN * 2;
  const innerH = CHART_HEIGHT - DOT_MARGIN * 2;

  const points = values.map((v, i) => ({
    x: DOT_MARGIN + (innerW * i) / (values.length - 1),
    // y축 뒤집기: 낮은 cent(=좋음)가 위로 간다
    y: DOT_MARGIN + (innerH * (v - min)) / range,
  }));

  const lastPoint = points[points.length - 1];

  const line = Skia.Path.Make();
  points.forEach((p, i) => {
    if (i === 0) line.moveTo(p.x, p.y);
    else line.lineTo(p.x, p.y);
  });

  // 선 아래를 옅게 채워 추세를 덩어리로 보이게 한다
  const area = line.copy();
  area.lineTo(lastPoint.x, CHART_HEIGHT);
  area.lineTo(points[0].x, CHART_HEIGHT);
  area.close();

  const first = values[0];
  const last = values[values.length - 1];
  const delta = Math.abs(Math.round((last - first) * 10) / 10);
  const improved = last < first;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>들을 수 있는 최소 차이 추이</Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{last}</Text>
            <Text style={styles.valueUnit}>음 높이 차이 · 최근</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.badge, improved && styles.badgeGood]}>
            <Text style={[styles.badgeText, improved && styles.badgeTextGood]}>
              {delta === 0 ? '변화 없음' : improved ? `↓ ${delta} 개선` : `↑ ${delta}`}
            </Text>
          </View>
          <Text style={styles.headerSub}>
            첫 측정 {first} → {last}
          </Text>
        </View>
      </View>

      <Canvas style={{ width: chartWidth, height: CHART_HEIGHT }}>
        <Path path={area}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, CHART_HEIGHT)}
            colors={['rgba(127, 179, 242, 0.35)', 'rgba(127, 179, 242, 0)']}
          />
        </Path>
        <Path
          path={line}
          style="stroke"
          strokeWidth={2.5}
          strokeCap="round"
          strokeJoin="round"
          color={COLORS.inkAccent}
        />
        {points.slice(0, -1).map((p, i) => (
          <Circle key={`pt-${i}`} cx={p.x} cy={p.y} r={3} color={COLORS.inkAccent} />
        ))}
        {/* 마지막 점 = 최근 기록. 흰 원 위에 오렌지 테두리를 겹쳐 눈에 띄게 한다 */}
        <Circle cx={lastPoint.x} cy={lastPoint.y} r={5} color={COLORS.inkText} />
        <Circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={5}
          style="stroke"
          strokeWidth={3}
          color={COLORS.secondary}
        />
      </Canvas>

      <View style={styles.axisRow}>
        <Text style={styles.axisText}>가장 오래된</Text>
        <Text style={styles.axisText}>최근</Text>
      </View>

      <Text style={styles.hint}>
        역치는 구별할 수 있는 가장 작은 음정 차이입니다.{' '}
        <Text style={styles.hintEmphasis}>낮을수록 정밀</Text>하게 듣고 있다는
        뜻이에요. 그래프는 위로 갈수록 낮은 값이라, 선이 올라가면 좋아지는
        중입니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.ink,
    borderRadius: RADIUS.xxl,
    paddingHorizontal: CARD_PADDING,
    paddingTop: CARD_PADDING,
    paddingBottom: SPACING.lg - 2,
    marginBottom: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  headerLeft: { flexShrink: 1 },
  headerRight: { alignItems: 'flex-end' },
  eyebrow: {
    color: COLORS.inkMuted,
    fontSize: FONT_SIZE.xs + 1,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    marginTop: SPACING.xs + 2,
  },
  value: {
    color: COLORS.inkText,
    fontSize: 40,
    fontWeight: '800',
  },
  valueUnit: {
    color: COLORS.inkMuted,
    fontSize: FONT_SIZE.sm,
  },
  badge: {
    paddingHorizontal: SPACING.md - 1,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    backgroundColor: 'transparent',
    borderColor: COLORS.inkBorder,
  },
  badgeGood: {
    backgroundColor: COLORS.inkSuccessBg,
    borderColor: COLORS.inkSuccessBorder,
  },
  badgeText: {
    color: COLORS.inkMuted,
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
  },
  badgeTextGood: {
    color: COLORS.inkSuccess,
  },
  headerSub: {
    color: COLORS.inkMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs + 2,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  axisText: {
    color: COLORS.inkAxis,
    fontSize: FONT_SIZE.xs,
  },
  hint: {
    color: COLORS.inkMuted,
    fontSize: FONT_SIZE.xs,
    lineHeight: 17,
    marginTop: SPACING.sm,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: COLORS.inkBorder,
  },
  hintEmphasis: {
    color: COLORS.inkSuccess,
    fontWeight: '600',
  },
  emptyBox: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.inkMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
});
