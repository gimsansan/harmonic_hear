import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';

// 시스템 배경색 설정 (스플래시 → 앱 전환 시 깜빡임 방지)
SystemUI.setBackgroundColorAsync('#12131C');

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#12131C' },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}
