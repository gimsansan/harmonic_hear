# Phase 1: 프로젝트 기반 세팅 — 보고서

## 계획
- Expo Router 기반 프로젝트 구조 세팅
- TypeScript, Babel, 다크 테마 루트 레이아웃 구성
- 홈 화면 + 훈련 화면 플레이스홀더 생성
- `react-native-audio-api` 설치
- 빌드 검증

## 생성된 파일

| 파일 | 역할 |
|------|------|
| `index.ts` | Expo Router 진입점 |
| `tsconfig.json` | TypeScript strict 모드 + `@/` 경로 별칭 |
| `babel.config.js` | Reanimated 플러그인 포함 |
| `app/_layout.tsx` | 루트 레이아웃 (다크 네이비 `#12131C`, StatusBar light) |
| `app/index.tsx` | 홈 화면 (로고, 훈련 시작 카드, 규제 고지문구 §1) |
| `app/training.tsx` | 훈련 화면 플레이스홀더 (Phase 3에서 완성) |
| `assets/images/splash.png` | 스플래시/아이콘 이미지 |

## 설치된 패키지
- 기존 `package.json` 의존성 전체 (`npm ci`)
- `react-native-audio-api` (Software Mansion) — expo 플러그인 자동 등록됨

## 검증 결과

| 검증 항목 | 결과 |
|-----------|------|
| `npm ci` | ✅ 1221 packages 설치 성공 |
| `react-native-audio-api` 설치 | ✅ 설치 + config plugin 자동 등록 |
| TypeScript 컴파일 (`tsc --noEmit`) | ✅ 에러 0개 |
| Expo 번들링 (`expo export --platform android`) | ✅ 성공 (번들 2.1MB) |

## 수정 사항
- `expo-status-bar`의 `StatusBar`에 `backgroundColor` prop이 없어서 제거 → `SystemUI.setBackgroundColorAsync`로 대체 (이미 처리됨)

## 다음 단계
→ **Phase 2: 오디오 엔진 핵심 로직** (AudioEngine, pitchUtils, keyzoneUtils, StaircaseEngine)
