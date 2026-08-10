import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { COLORS } from '../src/constants/theme';

// 시스템 배경색 설정 (스플래시 → 앱 전환 시 깜빡임 방지)
SystemUI.setBackgroundColorAsync(COLORS.background);

export default function RootLayout() {
  return (
    <>
      {/* 라이트 기조라 상태바 글자는 어둡게 */}
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}
