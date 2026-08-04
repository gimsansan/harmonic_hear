/**
 * 음고 감각 적응 훈련 화면 (§4.3, §7, §8)
 *
 * Phase 4: SessionManager 통합, 평가/훈련 이원화, 세션 저장
 *
 * 동작 순서 (§6):
 *   소리 A (기준, 설정 프리셋 Hz) 1.0s → 대기 0.5s → 소리 B (비교) 1.0s → 답변 대기
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import { AudioEngine, SoundMode } from '../src/audio/AudioEngine';
import { SessionManager, SessionMode } from '../src/training/SessionManager';
import { TrainingStorage } from '../src/storage/TrainingStorage';
import { AppSettingsStorage } from '../src/storage/AppSettingsStorage';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  RADIUS,
  AUDIO,
  REFERENCE_PRESETS,
} from '../src/constants/theme';

import ModeTab from '../src/components/ModeTab';
import SkiaWaveVisualizer from '../src/components/SkiaWaveVisualizer';
import AnswerButtons from '../src/components/AnswerButtons';
import FeedbackCard from '../src/components/FeedbackCard';

type GameState = 'idle' | 'playing' | 'waiting' | 'answered';

/** 세션 종료 버튼 노출에 필요한 최소 시행 수 */
const MIN_TRIALS_TO_END = 3;

export default function TrainingScreen() {
  const router = useRouter();

  // 엔진 인스턴스
  const audioEngine = useRef(new AudioEngine()).current;
  const sessionManager = useRef(new SessionManager()).current;

  // UI 상태
  const [soundMode, setSoundMode] = useState<SoundMode>('wave');
  const [sessionMode, setSessionMode] = useState<SessionMode>('training');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [activeSound, setActiveSound] = useState<'none' | 'A' | 'B'>('none');
  const [feedback, setFeedback] = useState<{
    message: string;
    isCorrect: boolean;
  } | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Staircase 상태 (UI 표시용)
  const [centsDifference, setCentsDifference] = useState(50);
  const [streak, setStreak] = useState(0);
  const [totalTrials, setTotalTrials] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [baseFreq, setBaseFreq] = useState<number>(AUDIO.BASE_FREQ);

  // 타이머 정리용
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isSessionActiveRef = useRef(false);

  useEffect(() => {
    audioEngine.init();
    return () => {
      audioEngine.dispose();
      timersRef.current.forEach(clearTimeout);
    };
  }, [audioEngine]);

  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  // 설정 화면에서 돌아온 뒤 프리셋 반영 (활성 세션 중에는 유지)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (isSessionActiveRef.current) return;
        const preset = await AppSettingsStorage.getReferencePitchPreset();
        if (!cancelled) {
          setBaseFreq(REFERENCE_PRESETS[preset].hz);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

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
   * 세션 시작 — 저장된 기준음 프리셋을 반영
   */
  const handleStartSession = useCallback(async () => {
    const preset = await AppSettingsStorage.getReferencePitchPreset();
    const hz = REFERENCE_PRESETS[preset].hz;
    setBaseFreq(hz);

    sessionManager.updateConfig({
      mode: sessionMode,
      soundMode,
      baseFreq: hz,
    });
    sessionManager.startSession();
    setIsSessionActive(true);
    setFeedback(null);
    setTotalTrials(0);
    setCorrectCount(0);
    setStreak(0);
    setCentsDifference(sessionManager.getStaircaseState().centsDifference);
  }, [sessionManager, sessionMode, soundMode]);

  /**
   * 세션 종료 + 결과 저장
   */
  const handleEndSession = useCallback(async () => {
    const result = sessionManager.endSession();
    setIsSessionActive(false);

    // AsyncStorage에 저장
    await TrainingStorage.saveSession(result);

    const accuracy = Math.round(result.accuracy * 100);
    Alert.alert(
      '세션 완료',
      `시행 ${result.totalTrials}회\n정답률 ${accuracy}%\n최소 음정 차이 ${result.minCentsAchieved}`,
      [{ text: '확인' }],
    );
  }, [sessionManager]);

  /**
   * 소리 재생 시퀀스
   */
  const handlePlaySound = useCallback(async () => {
    if (gameState === 'playing') return;

    // 세션이 아직 시작 안 됐으면 자동 시작 (프리셋 → baseFreq)
    if (!isSessionActive) {
      await handleStartSession();
    }

    // 사용자 제스처 시점에 suspended AudioContext를 깨움
    const audioReady = await audioEngine.ensureRunning();
    if (!audioReady) {
      console.warn('[Training] AudioContext를 시작할 수 없습니다.');
      return;
    }

    clearTimers();
    setGameState('playing');
    setFeedback(null);

    const roundState = sessionManager.prepareRound();
    setCentsDifference(roundState.centsDifference);
    setBaseFreq(roundState.baseFreq);

    const roundBaseFreq = roundState.baseFreq;
    const targetFreq = roundState.targetFreq;
    const duration = AUDIO.TONE_DURATION;
    const gap = AUDIO.GAP_DURATION;

    // 소리 A
    setActiveSound('A');
    void audioEngine.playTone(roundBaseFreq, 0, duration, soundMode);

    addTimer(() => setActiveSound('none'), duration * 1000);

    // 소리 B
    addTimer(() => {
      setActiveSound('B');
      void audioEngine.playTone(targetFreq, 0, duration, soundMode);
    }, (duration + gap) * 1000);

    // 답변 대기
    addTimer(() => {
      setActiveSound('none');
      setGameState('waiting');
    }, (duration + gap + duration) * 1000);
  }, [
    gameState,
    isSessionActive,
    soundMode,
    audioEngine,
    sessionManager,
    clearTimers,
    addTimer,
    handleStartSession,
  ]);

  /**
   * 답변 처리
   */
  const handleAnswer = useCallback(
    (userThinksHigher: boolean) => {
      if (gameState !== 'waiting' && gameState !== 'answered') return;

      const result = sessionManager.submitAnswer(userThinksHigher);

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
    [gameState, sessionManager],
  );

  /**
   * 모드 전환 (세션 비활성일 때만)
   */
  const handleSoundModeChange = useCallback(
    (newMode: SoundMode) => {
      if (isSessionActive) return;
      setSoundMode(newMode);
      setFeedback(null);
    },
    [isSessionActive],
  );

  const accuracy =
    totalTrials > 0 ? Math.round((correctCount / totalTrials) * 100) : 0;

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

        {/* 세션 모드 선택 (§4.3 평가/훈련 이원화) */}
        <View style={styles.sessionModeRow}>
          <TouchableOpacity
            style={[
              styles.sessionModeBtn,
              sessionMode === 'training' && styles.sessionModeBtnActive,
              isSessionActive && styles.sessionModeBtnDisabled,
            ]}
            onPress={() => !isSessionActive && setSessionMode('training')}
            activeOpacity={isSessionActive ? 1 : 0.7}
          >
            <Text
              style={[
                styles.sessionModeText,
                sessionMode === 'training' && styles.sessionModeTextActive,
              ]}
            >
              🏋️ 훈련
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sessionModeBtn,
              sessionMode === 'assessment' && styles.sessionModeBtnActive,
              isSessionActive && styles.sessionModeBtnDisabled,
            ]}
            onPress={() => !isSessionActive && setSessionMode('assessment')}
            activeOpacity={isSessionActive ? 1 : 0.7}
          >
            <Text
              style={[
                styles.sessionModeText,
                sessionMode === 'assessment' && styles.sessionModeTextActive,
              ]}
            >
              📋 평가
            </Text>
          </TouchableOpacity>
        </View>

        {/* 사운드 모드 탭 */}
        <ModeTab activeMode={soundMode} onModeChange={handleSoundModeChange} />

        {/* 정보 뱃지 */}
        <View style={styles.infoRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>음정 차이: {centsDifference}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>기준 {baseFreq} Hz</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🔥 연속: {streak}회</Text>
          </View>
        </View>

        {/* 통계 */}
        {totalTrials > 0 && (
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>
              시행 {totalTrials}회 · 정답률 {accuracy}%
            </Text>
          </View>
        )}

        {/* 시각화 */}
        <SkiaWaveVisualizer activeSound={activeSound} baseFreq={baseFreq} />

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

        {/* 답변 */}
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

        {/* 세션 종료: 3회 미만은 진행 표시, 이후 종료 버튼 */}
        {isSessionActive && (
          totalTrials >= MIN_TRIALS_TO_END ? (
            <TouchableOpacity
              style={styles.endSessionButton}
              onPress={handleEndSession}
              activeOpacity={0.7}
            >
              <Text style={styles.endSessionText}>세션 종료 및 저장</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.endProgress}>
              <View style={styles.endProgressTrack}>
                {Array.from({ length: MIN_TRIALS_TO_END }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.endProgressSegment,
                      i < totalTrials && styles.endProgressSegmentFilled,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.endProgressLabel}>
                {totalTrials}/{MIN_TRIALS_TO_END}
              </Text>
            </View>
          )
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
  sessionModeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sessionModeBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  sessionModeBtnActive: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primary,
  },
  sessionModeBtnDisabled: {
    opacity: 0.5,
  },
  sessionModeText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  sessionModeTextActive: {
    color: COLORS.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  badge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
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
  endSessionButton: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorBg,
  },
  endSessionText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  endProgress: {
    marginTop: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  endProgressTrack: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  endProgressSegment: {
    flex: 1,
    height: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.waveInactive,
  },
  endProgressSegmentFilled: {
    backgroundColor: COLORS.primary,
  },
  endProgressLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
