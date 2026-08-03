import React from 'react';
import { StyleSheet, View, Text, SafeAreaView } from 'react-native';

/**
 * 음고 훈련 화면 (Phase 1 플레이스홀더)
 * Phase 3에서 완전한 UI로 교체됩니다.
 */
export default function TrainingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🎵</Text>
        <Text style={styles.title}>음고 감각 적응 훈련</Text>
        <Text style={styles.subtitle}>
          Phase 2에서 오디오 엔진을 구현하고{'\n'}
          Phase 3에서 이 화면을 완성합니다.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12131C',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#8A8FAD',
    textAlign: 'center',
    lineHeight: 22,
  },
});
