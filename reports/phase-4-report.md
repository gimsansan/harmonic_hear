# Phase 4: 평가/훈련 이원화 + 세션 관리 — 보고서

## 계획
- SessionManager: 평가(Assessment)/훈련(Training) 이원화 프로토콜 (§4.3)
- TrainingStorage: AsyncStorage 기반 세션 결과 저장/조회
- training.tsx: SessionManager 통합 + 세션 시작/종료/저장 UI

## 생성/수정된 파일

| 파일 | 역할 | 상태 |
|------|------|------|
| `src/training/SessionManager.ts` | 평가/훈련 이원화, 반응시간 측정, 세션 관리 | 신규 |
| `src/storage/TrainingStorage.ts` | AsyncStorage 세션 저장/조회/통계 | 신규 |
| `app/training.tsx` | SessionManager 통합, 모드 전환 UI | 수정 |

## 핵심 구현 사항

### SessionManager
- `SessionMode`: 'assessment' (평가) / 'training' (훈련)
- 평가 모드: shift = 0 (포먼트 변형 0%) — 현재 DSP 모드에서는 동일 동작
- 훈련 모드: Staircase 난이도 적용
- 반응 시간: `prepareRound()` 호출 시 측정 시작, `submitAnswer()` 시 자동 계산
- 시행별 기록: `TrialRecord` (시행번호, 정답여부, 반응시간, cent격차, 방향, 타임스탬프)

### TrainingStorage
- `saveSession()`: 세션 결과 + 최고 기록 자동 갱신
- `getAllSessions()`, `getRecentSessions(n)`: 세션 조회
- `getBestScore()`: 최소 달성 cent 격차
- `getStats()`: 전체 통계 요약 (총 세션, 시행, 정답률, 평균 반응시간)

### training.tsx 업데이트
- 세션 모드 선택 UI (🏋️ 훈련 / 📋 평가)
- 세션 진행 중 모드 변경 불가
- 3회 이상 시행 후 "세션 종료 및 저장" 버튼 표시
- 종료 시 Alert로 결과 요약 표시

## 검증 결과

| 검증 항목 | 결과 |
|-----------|------|
| TypeScript 컴파일 (`tsc --noEmit`) | ✅ 에러 0개 |
| Expo 번들링 (`expo export --platform android`) | ✅ 성공 (3.9MB) |

## 다음 단계
→ **Phase 5: Skia 시각화 업그레이드** (SkiaWaveVisualizer)
