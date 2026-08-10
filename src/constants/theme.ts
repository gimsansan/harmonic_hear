/**
 * 디자인 토큰 (§7 디자인 시스템)
 *
 * 명세서에서 정의된 색상·간격·타이포그래피를 중앙 관리합니다.
 */

export const COLORS = {
  /** 어두운 네이비 배경 */
  background: '#12131C',
  /** 카드/서피스 배경 */
  surface: '#1A1C2E',
  /** 입력 필드/탭 배경 */
  surfaceAlt: '#1E202F',
  /** 활성 탭 배경 */
  surfaceActive: '#2C3048',
  /** 테두리 */
  border: '#2A2D48',

  /** 소리 A / 시안 */
  primary: '#00E5FF',
  /** 소리 B / 오렌지 */
  secondary: '#FF6D00',
  /** 정답 */
  success: '#00E676',
  /** 오답 */
  error: '#FF5252',

  /** 주요 텍스트 */
  text: '#FFFFFF',
  textPrimary: '#FFFFFF',
  /** 보조 텍스트 */
  textSecondary: '#D1D5F0',
  /** 비활성 텍스트 — 대비 5.8:1 (WCAG AA 통과) */
  textMuted: '#8A8FAD',
  /**
   * 매우 비활성 텍스트 — 대비 4.75:1 (WCAG AA 통과)
   * 이전 #6B70A0은 3.9:1로 AA 미달이었고, 하필 규제 고지문에 쓰이고 있었음
   */
  textDisabled: '#7B80A0',
  /**
   * 장식용 최소 대비 — 대비 2.3:1 (AA 미달).
   * **본문 텍스트에 쓰지 마세요.** 구분선·아이콘 등 비필수 요소 전용.
   */
  textMinimal: '#4A4E6A',

  /** 비활성 시각화 바 */
  waveInactive: '#333A52',
  /** 높음 버튼 배경 */
  highButtonBg: '#1E2D3D',
  /** 낮음 버튼 배경 */
  lowButtonBg: '#3D2520',

  /** 정답 피드백 배경 */
  successBg: 'rgba(0, 230, 118, 0.15)',
  /** 오답 피드백 배경 */
  errorBg: 'rgba(255, 82, 82, 0.15)',

  /** 비활성 재생 버튼 */
  disabledButton: '#2A4D59',

  /** primary 배경 위에 얹는 텍스트 (시안 버튼의 글자색) */
  onPrimary: '#0A101D',
} as const;

/** 안드로이드 최소 터치 타깃 (dp) */
export const MIN_TOUCH_TARGET = 48;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
} as const;

export const RADIUS = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  pill: 999,
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 14,
  lg: 15,
  xl: 16,
  xxl: 20,
  xxxl: 22,
  title: 24,
  hero: 32,
} as const;

/** 기준 음고 프리셋 키 (고역 프리셋 없음) */
export type ReferencePitchPreset = 'standard' | 'mid' | 'low';

/** 기준 음고 프리셋 — 표준 440 / 중역 330 / 저역 262 */
export const REFERENCE_PRESETS: Record<
  ReferencePitchPreset,
  { label: string; hz: number }
> = {
  standard: { label: '표준 (A4)', hz: 440 },
  mid: { label: '중역', hz: 330 },
  low: { label: '저역', hz: 262 },
} as const;

export const AUDIO = {
  /** 기본 기준음 주파수 (A4) — 프리셋 standard와 동일 */
  BASE_FREQ: 440,
  /** 재생 주파수 하한 (Hz) */
  FREQ_MIN_HZ: 200,
  /** 재생 주파수 상한 (Hz) */
  FREQ_MAX_HZ: 2000,
  /** 소리 A 재생 시간 (초) */
  TONE_DURATION: 1.0,
  /** A→B 사이 대기 시간 (초) */
  GAP_DURATION: 0.5,
  /** Gain Envelope 공격 시간 (초) */
  ATTACK_TIME: 0.05,
  /** Gain Envelope 릴리스 시간 (초) */
  RELEASE_TIME: 0.05,
  /** 순수 파형 모드 서스테인 게인 */
  PEAK_GAIN_WAVE: 0.4,
  /** 포먼트 합성 모드 서스테인 게인 */
  PEAK_GAIN_VOICE: 0.3,
  /** 포먼트 합성 F1 주파수 */
  FORMANT_F1: 800,
  /** 포먼트 합성 F2 주파수 */
  FORMANT_F2: 1200,
  /** 포먼트 합성 Q 값 */
  FORMANT_Q: 3.0,
} as const;

export const STAIRCASE = {
  /**
   * 초기 cent 격차.
   * 누구나 들리는 쉬운 값에서 시작해 하강한다.
   * (이전 50은 반음의 절반이라 초심자가 첫 문제부터 틀리는 원인이었음)
   */
  INITIAL_CENTS: 200,
  /** 최소 cent 격차 */
  MIN_CENTS: 10,
  /** 최대 cent 격차 (문헌 프록시 잠정값 · 파일럿 검증 대상) */
  MAX_CENTS: 300,
  /** 난이도 하강 트리거 (연속 정답 수) — 2-down-1-up */
  STREAK_THRESHOLD: 2,

  /**
   * 가변 스텝 표 — 반전이 쌓일수록 조정 폭을 좁힌다.
   *
   * 초반엔 크게 움직여 빨리 수렴시키고, 자기 수준 근처에서는 미세 조정한다.
   * `fromReversal` 이상의 반전 횟수에서 해당 `step`을 적용한다.
   */
  STEP_SCHEDULE: [
    { fromReversal: 0, step: 50 },
    { fromReversal: 2, step: 20 },
    { fromReversal: 4, step: 10 },
  ],

  /**
   * 역치 계산에서 버리는 초기 반전 수.
   * 수렴 전 구간이라 실제 능력보다 값이 크고 흔들린다.
   */
  THRESHOLD_DISCARD_REVERSALS: 2,
  /** 역치를 산출하기 위한 최소 반전 수 (이보다 적으면 역치 없음) */
  THRESHOLD_MIN_REVERSALS: 4,
} as const;

/**
 * 평가(Assessment) 세션 프로토콜.
 *
 * 훈련과 달리 **정해진 조건에서 자동 종료**합니다.
 * 사용자가 임의로 멈추면 세션마다 조건이 달라져 측정값을 비교할 수 없습니다.
 */
export const ASSESSMENT = {
  /** 이 반전 수에 도달하면 자동 종료 (역치가 충분히 수렴한 시점) */
  TARGET_REVERSALS: 8,
  /** 반전이 쌓이지 않아도 이 시행 수에서 강제 종료 (피로 방지) */
  MAX_TRIALS: 30,
} as const;

