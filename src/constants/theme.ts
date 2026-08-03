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
  textPrimary: '#FFFFFF',
  /** 보조 텍스트 */
  textSecondary: '#D1D5F0',
  /** 비활성 텍스트 */
  textMuted: '#8A8FAD',
  /** 매우 비활성 텍스트 */
  textDisabled: '#6B70A0',
  /** 최소 텍스트 (고지문구 등) */
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
} as const;

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

export const AUDIO = {
  /** 기준음 주파수 (A4) */
  BASE_FREQ: 440,
  /** 소리 A 재생 시간 (초) */
  TONE_DURATION: 1.0,
  /** A→B 사이 대기 시간 (초) */
  GAP_DURATION: 0.5,
  /** Gain Envelope 공격 시간 (초) */
  ATTACK_TIME: 0.05,
  /** Gain Envelope 릴리스 시간 (초) */
  RELEASE_TIME: 0.05,
  /** 포먼트 합성 F1 주파수 */
  FORMANT_F1: 800,
  /** 포먼트 합성 F2 주파수 */
  FORMANT_F2: 1200,
  /** 포먼트 합성 Q 값 */
  FORMANT_Q: 3.0,
} as const;

export const STAIRCASE = {
  /** 초기 cent 격차 */
  INITIAL_CENTS: 50,
  /** 최소 cent 격차 */
  MIN_CENTS: 10,
  /** 최대 cent 격차 */
  MAX_CENTS: 150,
  /** 정답 시 감소량 */
  STEP_DOWN: 10,
  /** 오답 시 증가량 */
  STEP_UP: 10,
  /** 난이도 하강 트리거 (연속 정답 수) */
  STREAK_THRESHOLD: 2,
} as const;

export const KEYZONE = {
  /** 녹음 샘플 간격 (cent) */
  SAMPLE_INTERVAL: 200,
  /** 최대 피치 시프트 (cent, 절대값) */
  MAX_SHIFT: 100,
} as const;
