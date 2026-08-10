/**
 * 모드 선택 탭 컴포넌트
 *
 * 순수 파형 (DSP) | 사람 목소리("아~") 전환
 *
 * 클리니컬 리디자인: 트랙 위에 흰 알약이 미끄러지는 세그먼트 컨트롤.
 * 선택된 쪽만 흰 면 + 진한 글자라, 눌린 쪽이 한눈에 보입니다.
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
import type { SoundMode } from '../audio/AudioEngine';

interface ModeTabProps {
  activeMode: SoundMode;
  onModeChange: (mode: SoundMode) => void;
  /**
   * 세션 중에는 소리 종류를 바꿀 수 없다.
   * 자극 종류가 바뀌면 그 세션의 측정값을 비교할 수 없기 때문이다.
   *
   * 잠긴 것을 화면에 드러내지 않으면 "눌러도 아무 일이 없는 고장"으로 읽힌다.
   */
  disabled?: boolean;
  /** 잠긴 이유 — disabled일 때 탭 아래에 표시 */
  disabledReason?: string;
}

/** 탭 아이콘 — Feather에 사인파가 없어 파형은 activity로 대신한다 */
const TAB_ICON: Record<SoundMode, React.ComponentProps<typeof Feather>['name']> =
  {
    wave: 'activity',
    voice: 'mic',
  };

export default function ModeTab({
  activeMode,
  onModeChange,
  disabled = false,
  disabledReason,
}: ModeTabProps) {
  const renderTab = (mode: SoundMode, label: string, a11yLabel: string) => {
    const isActive = activeMode === mode;
    const tint = isActive ? COLORS.primary : COLORS.textMuted;

    return (
      <TouchableOpacity
        style={[styles.tab, isActive && styles.activeTab]}
        onPress={() => onModeChange(mode)}
        disabled={disabled}
        activeOpacity={disabled ? 1 : 0.7}
        accessibilityRole="tab"
        accessibilityLabel={a11yLabel}
        accessibilityHint={disabled ? disabledReason : undefined}
        accessibilityState={{ selected: isActive, disabled }}
      >
        {disabled && isActive ? (
          <Feather name="lock" size={13} color={tint} />
        ) : (
          <Feather name={TAB_ICON[mode]} size={15} color={tint} />
        )}
        <Text
          style={[styles.tabText, isActive && styles.activeTabText]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.container, disabled && styles.containerDisabled]}
        accessibilityRole="tablist"
      >
        {renderTab('wave', '순수 파형 (DSP)', '순수 파형 모드')}
        {renderTab('voice', '사람 목소리(“아~”)', '사람 목소리 모드')}
      </View>

      {disabled && disabledReason ? (
        <Text style={styles.reason}>{disabledReason}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.lg,
  },
  container: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: 5,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.xs + 2,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.md,
    minHeight: MIN_TOUCH_TARGET - 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.md - 1,
  },
  activeTab: {
    backgroundColor: COLORS.surfaceActive,
  },
  tabText: {
    flexShrink: 1,
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.text,
    fontWeight: '700',
  },
  reason: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 16,
  },
});
