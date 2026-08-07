/**
 * 높음/낮음 답변 버튼 컴포넌트
 *
 * 소리 재생 중에는 비활성, 답변 후 피드백 표시 전까지 활성.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import {
  COLORS,
  RADIUS,
  SPACING,
  FONT_SIZE,
  MIN_TOUCH_TARGET,
} from '../constants/theme';

interface AnswerButtonsProps {
  disabled: boolean;
  onAnswer: (userThinksHigher: boolean) => void;
}

export default function AnswerButtons({ disabled, onAnswer }: AnswerButtonsProps) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.button, styles.highButton, disabled && styles.disabledButton]}
        onPress={() => onAnswer(true)}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="두 번째 소리가 더 높음"
        accessibilityHint="첫 번째 소리보다 두 번째 소리가 높다고 답합니다"
        accessibilityState={{ disabled }}
      >
        <Text style={styles.icon} accessibilityElementsHidden>
          ⬆️
        </Text>
        <Text style={[styles.text, disabled && styles.disabledText]}>
          B가 더 높음
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.lowButton, disabled && styles.disabledButton]}
        onPress={() => onAnswer(false)}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="두 번째 소리가 더 낮음"
        accessibilityHint="첫 번째 소리보다 두 번째 소리가 낮다고 답합니다"
        accessibilityState={{ disabled }}
      >
        <Text style={styles.icon} accessibilityElementsHidden>
          ⬇️
        </Text>
        <Text style={[styles.text, disabled && styles.disabledText]}>
          B가 더 낮음
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  button: {
    flex: 1,
    paddingVertical: 18,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  highButton: {
    backgroundColor: COLORS.highButtonBg,
    borderColor: COLORS.primary,
  },
  lowButton: {
    backgroundColor: COLORS.lowButtonBg,
    borderColor: COLORS.secondary,
  },
  disabledButton: {
    opacity: 0.4,
  },
  icon: {
    fontSize: 20,
    marginBottom: 4,
  },
  text: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  disabledText: {
    color: COLORS.textMuted,
  },
});
