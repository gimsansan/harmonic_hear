/**
 * 정답/오답 피드백 카드 컴포넌트
 *
 * 정답: 초록 테두리 + 반투명 배경
 * 오답: 빨강 테두리 + 반투명 배경
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Text } from 'react-native';
import { COLORS, RADIUS, SPACING, FONT_SIZE } from '../constants/theme';

interface FeedbackCardProps {
  message: string;
  isCorrect: boolean;
}

export default function FeedbackCard({ message, isCorrect }: FeedbackCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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
      <Text style={styles.text}>{message}</Text>
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
    borderColor: COLORS.success,
  },
  wrongCard: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.error,
  },
  text: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 22,
  },
});
