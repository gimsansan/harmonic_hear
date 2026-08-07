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
  AppState,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import { AudioEngine, SoundMode } from '../src/audio/AudioEngine';
import { SessionManager, SessionMode } from '../src/training/SessionManager';
import {
  GameState,
  PLAY_BUTTON_A11Y_LABEL,
  PLAY_BUTTON_LABEL,
  canPressPlay,
  canSubmitAnswer,
  isReplayPress,
  shouldAbortOnInterrupt,
  showsTrialFeedback,
} from '../src/training/trainingFlow';
import { TrainingStorage } from '../src/storage/TrainingStorage';
import { AppSettingsStorage } from '../src/storage/AppSettingsStorage';
import {
  hapticError,
  hapticSuccess,
  hapticTap,
  setHapticsEnabled,
} from '../src/utils/haptics';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  RADIUS,
  AUDIO,
  ASSESSMENT,
  STAIRCASE,
  REFERENCE_PRESETS,
  MIN_TOUCH_TARGET,
} from '../src/constants/theme';

import ModeTab from '../src/components/ModeTab';
import SkiaWaveVisualizer from '../src/components/SkiaWaveVisualizer';
import AnswerButtons from '../src/components/AnswerButtons';
import FeedbackCard from '../src/components/FeedbackCard';

/** 세션 종료 버튼 노출에 필요한 최소 시행 수 */
const MIN_TRIALS_TO_END = 3;

export default function TrainingScreen() {
  const router = useRouter();

  // 엔진 인스턴스 — 지연 초기화로 매 렌더마다 새로 만들지 않는다
  const [audioEngine] = useState(() => new AudioEngine());
  const [sessionManager] = useState(() => new SessionManager());

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
  /** 난이도 방향 전환 횟수 — 이 값이 쌓여야 변별 역치가 산출된다 */
  const [reversalCount, setReversalCount] = useState(0);
  /** 답변 후 공개할 B의 실제 주파수 (P3-6) */
  const [revealedTargetFreq, setRevealedTargetFreq] = useState<number | null>(null);
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

  /**
   * 앱 이탈·통화 인터럽션 처리 (P0-6)
   *
   * 백그라운드로 가도 타이머는 계속 돌기 때문에, 소리를 못 들은 채
   * 답변 버튼만 활성화된 상태로 돌아오게 됩니다. 그 라운드는 폐기합니다.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') return;

      setGameState((prev) => {
        if (!shouldAbortOnInterrupt(prev)) return prev;

        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
        setActiveSound('none');
        sessionManager.abortRound();
        return 'interrupted';
      });
    });

    return () => subscription.remove();
  }, [sessionManager]);

  // 설정 화면에서 돌아온 뒤 프리셋 반영 (활성 세션 중에는 유지)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setHapticsEnabled(await AppSettingsStorage.getHapticsEnabled());
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
    setReversalCount(0);
    setCentsDifference(sessionManager.getStaircaseState().centsDifference);
  }, [sessionManager, sessionMode, soundMode]);

  /**
   * 세션 종료 + 결과 저장
   */
  const handleEndSession = useCallback(async () => {
    const result = sessionManager.endSession();
    setIsSessionActive(false);

    const saved = await TrainingStorage.saveSession(result);

    if (!saved) {
      // 저장 실패를 성공처럼 보이게 하지 않는다 (P5-5)
      Alert.alert(
        '저장 실패',
        '기록을 저장하지 못했습니다. 기기 저장 공간을 확인해 주세요.\n' +
          '이번 세션 결과는 통계에 반영되지 않습니다.',
        [{ text: '확인' }],
      );
      return;
    }

    // 전용 결과 화면으로 이동 (P2-2)
    router.replace({ pathname: '/result', params: { sessionId: result.id } });
  }, [sessionManager, router]);

  /**
   * A → 대기 → B 재생 시퀀스.
   *
   * 이미 정해진 라운드의 주파수를 그대로 재생합니다.
   * 방향(정답) 추첨은 이 함수가 하지 않습니다 — 호출부에서 결정합니다.
   */
  const runPlaybackSequence = useCallback(
    async (roundBaseFreq: number, targetFreq: number) => {
      const duration = AUDIO.TONE_DURATION;
      const gap = AUDIO.GAP_DURATION;

      clearTimers();
      setGameState('playing');
      setActiveSound('A');

      // 두 톤을 하나의 오디오 클럭 기준점에 한 번에 예약한다 (P0-5).
      // 톤마다 따로 예약하면 그 사이의 JS 지연이 A→B 간격에 섞인다.
      await audioEngine.playSequence(
        [
          { freq: roundBaseFreq, offset: 0, duration },
          { freq: targetFreq, offset: duration + gap, duration },
        ],
        soundMode,
      );

      // 시각 하이라이트만 JS 타이머로 처리 (정밀도가 덜 중요)
      addTimer(() => setActiveSound('none'), duration * 1000);
      addTimer(() => setActiveSound('B'), (duration + gap) * 1000);

      // 답변 대기 — 반응 시간은 이 시점부터 측정
      addTimer(() => {
        setActiveSound('none');
        sessionManager.openResponseWindow();
        setGameState('waiting');
      }, (duration + gap + duration) * 1000);
    },
    [soundMode, audioEngine, sessionManager, clearTimers, addTimer],
  );

  /**
   * 새 문제 — 방향을 새로 추첨하고 재생
   */
  const handleNextRound = useCallback(async () => {
    if (!canPressPlay(gameState)) return;

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

    setFeedback(null);

    const roundState = sessionManager.prepareRound();
    setCentsDifference(roundState.centsDifference);
    setBaseFreq(roundState.baseFreq);

    await runPlaybackSequence(roundState.baseFreq, roundState.targetFreq);
  }, [
    gameState,
    isSessionActive,
    audioEngine,
    sessionManager,
    handleStartSession,
    runPlaybackSequence,
  ]);

  /**
   * 다시 듣기 — 같은 문제를 그대로 재생 (방향 재추첨 없음)
   */
  const handleReplay = useCallback(async () => {
    if (!isReplayPress(gameState)) return;

    const audioReady = await audioEngine.ensureRunning();
    if (!audioReady) {
      console.warn('[Training] AudioContext를 시작할 수 없습니다.');
      return;
    }

    // prepareRound를 호출하지 않으므로 targetFreq·isHigher가 유지됨
    const roundState = sessionManager.getStaircaseState();
    sessionManager.countReplay();

    await runPlaybackSequence(roundState.baseFreq, roundState.targetFreq);
  }, [gameState, audioEngine, sessionManager, runPlaybackSequence]);

  /** 재생 버튼: 답변 대기 중이면 '다시 듣기', 그 외에는 '새 문제' */
  const handlePlayPress = isReplayPress(gameState)
    ? handleReplay
    : handleNextRound;

  /**
   * 답변 처리 — 한 라운드에 한 번만 받는다
   */
  const handleAnswer = useCallback(
    (userThinksHigher: boolean) => {
      if (!canSubmitAnswer(gameState)) return;

      const result = sessionManager.submitAnswer(userThinksHigher);

      // 촉각 피드백 — 평가 모드에서도 정답 여부는 알리지 않는다
      if (showsTrialFeedback(sessionMode)) {
        if (result.isCorrect) hapticSuccess();
        else hapticError();
      } else {
        hapticTap();
      }

      // 평가 모드는 시행별 정답을 알려주지 않는다 (P1-2)
      // 도중에 요령을 배우면 "현재 실력" 측정이 왜곡된다
      setFeedback(
        showsTrialFeedback(sessionMode)
          ? { message: result.message, isCorrect: result.isCorrect }
          : null,
      );
      setCentsDifference(result.newState.centsDifference);
      setStreak(result.newState.streak);
      setTotalTrials(result.newState.totalTrials);
      setCorrectCount(result.newState.correctCount);
      setReversalCount(result.newState.reversalCount);
      // 평가 모드는 정답을 숨기므로 주파수도 공개하지 않는다
      setRevealedTargetFreq(
        showsTrialFeedback(sessionMode) ? result.newState.targetFreq : null,
      );
      setGameState('answered');

      // 평가 세션은 정해진 조건에서 자동 종료 (P1-2)
      if (sessionManager.shouldAutoEnd()) {
        void handleEndSession();
      }
    },
    [gameState, sessionMode, sessionManager, handleEndSession],
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

  /** 진행 상황 안내 — 평가는 종료 조건까지, 훈련은 역치 산출까지를 보여준다 */
  const progressHint = (() => {
    if (sessionMode === 'assessment') {
      return `방향 전환 ${reversalCount}/${ASSESSMENT.TARGET_REVERSALS} · 최대 ${ASSESSMENT.MAX_TRIALS}문항에서 자동 종료`;
    }
    if (reversalCount >= STAIRCASE.THRESHOLD_MIN_REVERSALS) {
      return '변별 역치 산출 가능';
    }
    return `난이도 방향 전환 ${reversalCount}/${STAIRCASE.THRESHOLD_MIN_REVERSALS} · 역치 산출까지`;
  })();

  const hidesTrialFeedback = !showsTrialFeedback(sessionMode);

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
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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
            accessibilityRole="tab"
            accessibilityLabel="훈련 모드"
            accessibilityHint="문제마다 정답을 알려줍니다"
            accessibilityState={{
              selected: sessionMode === 'training',
              disabled: isSessionActive,
            }}
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
            accessibilityRole="tab"
            accessibilityLabel="평가 모드"
            accessibilityHint="정답을 숨기고 정해진 조건에서 자동 종료합니다"
            accessibilityState={{
              selected: sessionMode === 'assessment',
              disabled: isSessionActive,
            }}
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
            <Text style={styles.statsSubText}>{progressHint}</Text>
          </View>
        )}

        {/* 시각화 */}
        <SkiaWaveVisualizer
          activeSound={activeSound}
          baseFreq={baseFreq}
          // 정답 공개 후에만 B의 실제 주파수를 보여준다 (P3-6)
          targetFreq={gameState === 'answered' ? revealedTargetFreq : null}
        />

        {/* 재생 버튼 */}
        <TouchableOpacity
          style={[
            styles.playButton,
            !canPressPlay(gameState) && styles.disabledPlayButton,
          ]}
          onPress={handlePlayPress}
          disabled={!canPressPlay(gameState)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={PLAY_BUTTON_A11Y_LABEL[gameState]}
          accessibilityState={{ disabled: !canPressPlay(gameState) }}
        >
          <Text style={styles.playButtonText}>
            {PLAY_BUTTON_LABEL[gameState]}
          </Text>
        </TouchableOpacity>

        {/* 질문 */}
        <Text style={styles.questionText}>
          첫 번째 소리(A) 대비 두 번째 소리(B)의 높낮이는?
        </Text>

        {/* 답변 — 'waiting'(재생 완료 후 미답변)일 때만 받는다 */}
        <AnswerButtons
          disabled={!canSubmitAnswer(gameState)}
          onAnswer={handleAnswer}
        />

        {/* 피드백 (훈련 모드만) */}
        {feedback && (
          <FeedbackCard
            message={feedback.message}
            isCorrect={feedback.isCorrect}
          />
        )}

        {/* 평가 모드: 정답을 알려주지 않고 접수만 알린다 (P1-2) */}
        {hidesTrialFeedback && gameState === 'answered' && (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>
              답변이 기록되었습니다.{'\n'}
              결과는 평가가 끝난 뒤 한 번에 알려드립니다.
            </Text>
          </View>
        )}

        {/* 앱 이탈로 라운드를 버린 경우 (P0-6) */}
        {gameState === 'interrupted' && (
          <View style={[styles.noticeCard, styles.noticeCardWarn]}>
            <Text style={styles.noticeText}>
              소리를 놓쳐 이번 문제는 기록하지 않았습니다.{'\n'}
              새 문제로 다시 시작해 주세요.
            </Text>
          </View>
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
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
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
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
  },
  statsSubText: {
    color: COLORS.textDisabled,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
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
    color: COLORS.onPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
  },
  noticeCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  noticeCardWarn: {
    borderColor: COLORS.secondary,
  },
  noticeText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    lineHeight: 22,
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
