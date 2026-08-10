/**
 * 정답/오답 피드백 카드 컴포넌트
 *
 * 정답: 초록 테두리 + 반투명 배경
 * 오답: 빨강 테두리 + 반투명 배경
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Animated, Text } from 'react-native';
import { COLORS, RADIUS, SPACING, FONT_SIZE } from '../constants/theme';

interface FeedbackCardProps {
  message: string;
  isCorrect: boolean;
}

export default function FeedbackCard({
  message,
  isCorrect,
}: Readonly<FeedbackCardProps>) {
  // 지연 초기화 — 매 렌더마다 Animated.Value를 새로 만들지 않는다
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(20));

  useEffect(() => {
    // 등장 애니메이션: fade-in + slide-up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [message, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.card,
        isCorrect ? styles.correctCard : styles.wrongCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={[styles.text, isCorrect ? styles.correctText : styles.wrongText]}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
  },
  correctCard: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successAccent,
  },
  wrongCard: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.error,
  },
  text: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 22,
  },
  // 라이트 배경에서는 면 색만으로 정답/오답이 잘 안 갈린다 — 글자에도 색을 준다
  correctText: { color: COLORS.success },
  wrongText: { color: COLORS.error },
});
