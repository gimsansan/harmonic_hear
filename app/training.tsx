/**
 * 음고 감각 적응 훈련 화면 (§7, §8)
 *
 * Phase 2 엔진(AudioEngine + StaircaseEngine)과
 * Phase 3 컴포넌트(ModeTab, WaveVisualizer, AnswerButtons, FeedbackCard)를 통합.
 *
 * 동작 순서 (§6):
 *   소리 A (기준, 440Hz) 1.0s → 대기 0.5s → 소리 B (비교) 1.0s → 답변 대기
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

import { AudioEngine, SoundMode } from '../src/audio/AudioEngine';
import { StaircaseEngine } from '../src/training/StaircaseEngine';
import { COLORS, SPACING, FONT_SIZE, RADIUS, AUDIO } from '../src/constants/theme';

import ModeTab from '../src/components/ModeTab';
import WaveVisualizer from '../src/components/WaveVisualizer';
import AnswerButtons from '../src/components/AnswerButtons';
import FeedbackCard from '../src/components/FeedbackCard';

type GameState = 'idle' | 'playing' | 'waiting' | 'answered';

export default function TrainingScreen() {
  const router = useRouter();

  // 엔진 인스턴스 (ref로 유지 — 리렌더링 방지)
  const audioEngine = useRef(new AudioEngine()).current;
  const staircaseEngine = useRef(new StaircaseEngine()).current;

  // UI 상태
  const [mode, setMode] = useState<SoundMode>('wave');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [activeSound, setActiveSound] = useState<'none' | 'A' | 'B'>('none');
  const [feedback, setFeedback] = useState<{
    message: string;
    isCorrect: boolean;
  } | null>(null);

  // Staircase 상태 (UI 표시용)
  const [centsDifference, setCentsDifference] = useState(50);
  const [streak, setStreak] = useState(0);
  const [totalTrials, setTotalTrials] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // 타이머 정리용
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    audioEngine.init();
    return () => {
      audioEngine.dispose();
      timersRef.current.forEach(clearTimeout);
    };
  }, [audioEngine]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const addTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  /**
   * 소리 재생 시퀀스 시작
   * A(기준) 1.0s → 대기 0.5s → B(비교) 1.0s
   */
  const handlePlaySound = useCallback(() => {
    if (gameState === 'playing') return;

    clearTimers();
    setGameState('playing');
    setFeedback(null);

    // 새 라운드 준비 (B 방향 랜덤 결정)
    const roundState = staircaseEngine.prepareRound();
    setCentsDifference(roundState.centsDifference);

    const baseFreq = roundState.baseFreq;
    const targetFreq = roundState.targetFreq;
    const duration = AUDIO.TONE_DURATION;
    const gap = AUDIO.GAP_DURATION;

    // 소리 A 재생
    setActiveSound('A');
    audioEngine.playTone(baseFreq, 0, duration, mode);

    // 소리 A 끝
    addTimer(() => {
      setActiveSound('none');
    }, duration * 1000);

    // 소리 B 재생 (A 끝 + 0.5s 대기 후)
    addTimer(() => {
      setActiveSound('B');
      audioEngine.playTone(targetFreq, 0, duration, mode);
    }, (duration + gap) * 1000);

    // 소리 B 끝 → 답변 대기
    addTimer(() => {
      setActiveSound('none');
      setGameState('waiting');
    }, (duration + gap + duration) * 1000);
  }, [gameState, mode, audioEngine, staircaseEngine, clearTimers, addTimer]);

  /**
   * 사용자 답변 처리
   */
  const handleAnswer = useCallback(
    (userThinksHigher: boolean) => {
      if (gameState !== 'waiting' && gameState !== 'idle' && gameState !== 'answered') return;

      const result = staircaseEngine.submitAnswer(userThinksHigher);

      setFeedback({
        message: result.message,
        isCorrect: result.isCorrect,
      });
      setCentsDifference(result.newState.centsDifference);
      setStreak(result.newState.streak);
      setTotalTrials(result.newState.totalTrials);
      setCorrectCount(result.newState.correctCount);
      setGameState('answered');
    },
    [gameState, staircaseEngine],
  );

  /**
   * 모드 전환
   */
  const handleModeChange = useCallback((newMode: SoundMode) => {
    setMode(newMode);
    setFeedback(null);
  }, []);

  // 정답률 계산
  const accuracy = totalTrials > 0 ? Math.round((correctCount / totalTrials) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backText}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🎵 음고 감각 적응 훈련</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* 모드 탭 */}
        <ModeTab activeMode={mode} onModeChange={handleModeChange} />

        {/* 정보 뱃지 */}
        <View style={styles.infoRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>격차: {centsDifference} Cents</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🔥 연속 정답: {streak}회</Text>
          </View>
        </View>

        {/* 통계 바 */}
        {totalTrials > 0 && (
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>
              시행 {totalTrials}회 · 정답률 {accuracy}%
            </Text>
          </View>
        )}

        {/* 시각화 */}
        <WaveVisualizer activeSound={activeSound} />

        {/* 재생 버튼 */}
        <TouchableOpacity
          style={[
            styles.playButton,
            gameState === 'playing' && styles.disabledPlayButton,
          ]}
          onPress={handlePlaySound}
          disabled={gameState === 'playing'}
          activeOpacity={0.8}
        >
          <Text style={styles.playButtonText}>
            {gameState === 'playing'
              ? '🔊 소리 감상 중...'
              : gameState === 'answered'
                ? '▶️ 다음 소리 듣기 (A → B)'
                : '▶️ 소리 듣기 (A → B)'}
          </Text>
        </TouchableOpacity>

        {/* 질문 */}
        <Text style={styles.questionText}>
          첫 번째 소리(A) 대비 두 번째 소리(B)의 높낮이는?
        </Text>

        {/* 답변 버튼 */}
        <AnswerButtons
          disabled={gameState === 'playing' || gameState === 'idle'}
          onAnswer={handleAnswer}
        />

        {/* 피드백 */}
        {feedback && (
          <FeedbackCard
            message={feedback.message}
            isCorrect={feedback.isCorrect}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
  },
  backButton: {
    paddingVertical: SPACING.sm,
    paddingRight: SPACING.md,
  },
  backText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: 50,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  badge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  statsRow: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statsText: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
  },
  playButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  disabledPlayButton: {
    backgroundColor: COLORS.disabledButton,
  },
  playButtonText: {
    color: '#0A101D',
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
  },
  questionText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.lg,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    fontWeight: '500',
  },
});
