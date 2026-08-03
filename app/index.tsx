import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* 로고 영역 */}
      <View style={styles.logoSection}>
        <Text style={styles.logoEmoji}>🎵</Text>
        <Text style={styles.appName}>HarmoniTune</Text>
        <Text style={styles.appNameKr}>하모니 튠</Text>
        <Text style={styles.tagline}>
          음고 인지 감각 훈련 · 음악 청취 웰니스
        </Text>
      </View>

      {/* 메인 카드 */}
      <View style={styles.cardSection}>
        <TouchableOpacity
          style={styles.mainCard}
          onPress={() => router.push('/training')}
          activeOpacity={0.8}
        >
          <View style={styles.cardIconRow}>
            <Text style={styles.cardIcon}>🎧</Text>
          </View>
          <Text style={styles.cardTitle}>음고 감각 적응 훈련</Text>
          <Text style={styles.cardDesc}>
            두 소리의 높낮이 차이를 구별하는{'\n'}감각 훈련을 시작합니다
          </Text>
          <View style={styles.startBadge}>
            <Text style={styles.startBadgeText}>훈련 시작 →</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 하단 고지 문구 */}
      <View style={styles.disclaimerSection}>
        <Text style={styles.disclaimer}>
          본 앱은 의료기기가 아닙니다. 질병의 진단·치료·예방 목적으로 사용할 수
          없으며, 청각 보조 기기 착용자의 음악 감상 경험을 향상시키는 디지털
          웰니스 콘텐츠입니다.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12131C',
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  appNameKr: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8A8FAD',
    marginTop: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#6B70A0',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardSection: {
    flex: 1,
    justifyContent: 'center',
  },
  mainCard: {
    backgroundColor: '#1A1C2E',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#2A2D48',
  },
  cardIconRow: {
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 40,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#8A8FAD',
    lineHeight: 22,
    marginBottom: 20,
  },
  startBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#00E5FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startBadgeText: {
    color: '#0A101D',
    fontSize: 15,
    fontWeight: 'bold',
  },
  disclaimerSection: {
    paddingBottom: 24,
  },
  disclaimer: {
    fontSize: 11,
    color: '#4A4E6A',
    textAlign: 'center',
    lineHeight: 17,
  },
});
