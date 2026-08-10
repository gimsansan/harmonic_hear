/**
 * 디자인 토큰 (§7 디자인 시스템)
 *
 * 명세서에서 정의된 색상·간격·타이포그래피를 중앙 관리합니다.
 *
 * 클리니컬 리디자인: 어두운 네이비 기조 → **라이트 기조**로 전면 교체.
 * 화이트 서피스 + 블루 프라이머리, 주의·소리 B 계열만 절제된 오렌지.
 *
 * 대비는 라이트 배경(`background` #F1F5FA)을 기준으로 재계산했습니다.
 * 디자인 시안의 회색이 몇 군데 AA에 못 미쳐, 색상 계열은 유지한 채
 * 명도만 낮춰 잡았습니다 (아래 각 항목의 대비 수치 참고).
 */

export const COLORS = {
  /** 페이지 배경 — 아주 옅은 블루그레이 */
  background: '#F1F5FA',
  /** 카드/서피스 배경 */
  surface: '#FFFFFF',
  /** 세그먼트 탭 트랙 배경 */
  surfaceAlt: '#EAEFF6',
  /** 활성 세그먼트 (트랙 위에 뜨는 흰 알약) */
  surfaceActive: '#FFFFFF',
  /** 안내문처럼 살짝 눌러 둔 면 */
  surfaceSubtle: '#F4F7FB',
  /** 테두리 */
  border: '#DBE3EE',
  /** 카드 내부 구분선 — 테두리보다 더 옅다 */
  borderSoft: '#EEF2F7',

  /** 소리 A / 프라이머리 블루 — 흰 배경 대비 4.9:1 */
  primary: '#1B6FD6',
  /** 프라이머리 연한 면 (아이콘 타일·활성 탭 배경) */
  primarySoft: '#E8F1FD',
  /** 소리 B / 오렌지 — **면·테두리·아이콘 전용** (텍스트 대비 3.1:1로 AA 미달) */
  secondary: '#E8703A',
  /** 오렌지 계열 **텍스트**용 — 대비 5.0:1 (WCAG AA 통과) */
  secondaryText: '#B8511E',
  /** 오렌지 연한 면 */
  secondarySoft: '#FDF2EA',
  /** 정답 / 개선 — 대비 5.3:1 */
  success: '#0F7A58',
  /** 정답 카드 테두리 */
  successAccent: '#7FD6B3',
  /** 오답 / 파괴적 동작 — 대비 4.8:1 (시안 #D64545는 3.9:1로 AA 미달) */
  error: '#C0392B',

  /** 주요 텍스트 — 대비 15.1:1 */
  text: '#12233B',
  textPrimary: '#12233B',
  /** 보조 텍스트 — 대비 8.3:1 */
  textSecondary: '#3C4A60',
  /** 비활성 텍스트 — 대비 5.6:1 (WCAG AA 통과) */
  textMuted: '#55637A',
  /**
   * 매우 비활성 텍스트 — 대비 4.8:1 (WCAG AA 통과)
   * 규제 고지문이 이 색을 쓰므로 AA 아래로 내리지 마세요.
   */
  textDisabled: '#5F6E85',
  /**
   * 장식용 최소 대비 — 대비 2.6:1 (AA 미달).
   * **본문 텍스트에 쓰지 마세요.** 구분선·아이콘 등 비필수 요소 전용.
   */
  textMinimal: '#9AA6B8',

  /** 비활성 시각화 바 */
  waveInactive: '#C6D2E2',
  /** 높음 버튼 배경 */
  highButtonBg: '#EEF5FE',
  /** 낮음 버튼 배경 */
  lowButtonBg: '#FDF2EA',

  /** 정답 피드백 배경 */
  successBg: '#EAFAF3',
  /** 오답 피드백 배경 */
  errorBg: '#FBEDED',

  /** 비활성 재생 버튼 (글자색은 textSecondary — 대비 6.0:1) */
  disabledButton: '#C3D4EA',

  /** primary 배경 위에 얹는 텍스트 (파란 버튼의 글자색) */
  onPrimary: '#FFFFFF',

  /**
   * 어두운 강조 패널 — 역치처럼 "이 화면의 결론"인 지표 하나에만 씁니다.
   * 라이트 화면에서 딱 한 덩이만 어두우면 시선이 그리로 모입니다.
   */
  ink: '#12233B',
  inkText: '#FFFFFF',
  /** ink 위 보조 텍스트 — 대비 7.7:1 */
  inkMuted: '#9DB8DC',
  /** ink 위 축 라벨 — 대비 5.1:1 */
  inkAxis: '#7F93B3',
  /** ink 위 구분선 */
  inkBorder: '#24374F',
  /** ink 위 그래프 선·강조 — 대비 7.3:1 */
  inkAccent: '#7FB3F2',
  /** ink 위 개선 표시 */
  inkSuccess: '#5FE0B0',
  inkSuccessBg: '#12604A',
  inkSuccessBorder: '#1F8F68',
} as const;

/** 안드로이드 최소 터치 타깃 (dp) */
export const MIN_TOUCH_TARGET = 48;

/**
 * 안드로이드 그림자 단계 (`elevation`).
 *
 * 라이트 기조에서는 테두리로 면을 나누고, 그림자는 "지금 눌러야 할 것"
 * 하나에만 씁니다. 카드마다 그림자를 주면 화면이 지저분해집니다.
 */
export const ELEVATION = {
  /** 기본 카드 — 테두리만 (그림자 없음) */
  flat: 0,
  /** 주 동선 카드 */
  card: 2,
  /** 주 실행 버튼 */
  raised: 4,
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
  /** 큰 카드 — 홈 메인 카드·결과 히어로 */
  xxxl: 22,
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

