/**
 * 높음/낮음 답변 버튼 컴포넌트
 *
 * 소리 재생 중에는 비활성, 답변 후 피드백 표시 전까지 활성.
 *
 * 클리니컬 리디자인: 높음은 블루(소리 A 계열), 낮음은 오렌지(소리 B 계열).
 * 비활성일 때는 투명도만 낮추지 않고 **색을 빼서** 회색 면으로 바꿉니다.
 * 라이트 배경에서 반투명 색면은 "누를 수 있어 보이는데 안 눌리는" 상태가 됩니다.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
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
        style={[styles.button, disabled ? styles.mutedButton : styles.highButton]}
        onPress={() => onAnswer(true)}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="두 번째 소리가 더 높음"
        accessibilityHint="첫 번째 소리보다 두 번째 소리가 높다고 답합니다"
        accessibilityState={{ disabled }}
      >
        <Feather
          name="arrow-up"
          size={20}
          color={disabled ? COLORS.textMinimal : COLORS.primary}
        />
        <Text style={[styles.text, disabled && styles.disabledText]}>
          B가 더 높음
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, disabled ? styles.mutedButton : styles.lowButton]}
        onPress={() => onAnswer(false)}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="두 번째 소리가 더 낮음"
        accessibilityHint="첫 번째 소리보다 두 번째 소리가 낮다고 답합니다"
        accessibilityState={{ disabled }}
      >
        <Feather
          name="arrow-down"
          size={20}
          color={disabled ? COLORS.textMinimal : COLORS.secondary}
        />
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
    gap: SPACING.sm - 2,
    height: 86,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  highButton: {
    backgroundColor: COLORS.highButtonBg,
    borderColor: COLORS.primary,
  },
  lowButton: {
    backgroundColor: COLORS.lowButtonBg,
    borderColor: COLORS.secondary,
  },
  mutedButton: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  text: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  disabledText: {
    color: COLORS.textDisabled,
  },
});
