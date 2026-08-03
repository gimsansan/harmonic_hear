/**
 * 모드 선택 탭 컴포넌트
 *
 * 🌊 순수 파형 (DSP) | 🎤 사람 목소리("아~") 전환
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { COLORS, RADIUS, SPACING, FONT_SIZE } from '../constants/theme';
import type { SoundMode } from '../audio/AudioEngine';

interface ModeTabProps {
  activeMode: SoundMode;
  onModeChange: (mode: SoundMode) => void;
}

export default function ModeTab({ activeMode, onModeChange }: ModeTabProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, activeMode === 'wave' && styles.activeTab]}
        onPress={() => onModeChange('wave')}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.tabText, activeMode === 'wave' && styles.activeTabText]}
        >
          🌊 순수 파형 (DSP)
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeMode === 'voice' && styles.activeTab]}
        onPress={() => onModeChange('voice')}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.tabText,
            activeMode === 'voice' && styles.activeTabText,
          ]}
        >
          🎤 사람 목소리("아~")
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  activeTab: {
    backgroundColor: COLORS.surfaceActive,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});
