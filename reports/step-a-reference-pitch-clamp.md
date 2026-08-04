# Step A: 기준음 프리셋 · 주파수 클램프 — 결과

계획: `docs/기준음_선택과_주파수_클램프_계획.md` §7 Step A  
일시: 2026-08-04

## 계획

- `REFERENCE_PRESETS` (440 / 330 / 262) + `FREQ_MIN_HZ` / `FREQ_MAX_HZ`
- `clampFreq` 유틸
- `StaircaseEngine.prepareRound`에서 `targetFreq` 클램프 + `clampCount`
- 경계 케이스 숫자 검증 (특히 262 − 300 cent)

## 변경 파일

| 파일 | 내용 |
|------|------|
| `src/constants/theme.ts` | `ReferencePitchPreset`, `REFERENCE_PRESETS`, `AUDIO.FREQ_MIN_HZ`(200), `FREQ_MAX_HZ`(2000) |
| `src/audio/pitchUtils.ts` | `clampFreq` (`clampDetune`과 동일하게 `{ clamped, wasOverLimit }` 반환) |
| `src/training/StaircaseEngine.ts` | `prepareRound` 클램프, `getClampCount()`, `reset` 시 카운트 초기화, `__DEV__` 로그 |

## 결과

경계 케이스 (`centsToFreq` → 200~2000 클램프):

| 조합 | Hz (약) | 클램프 |
|------|---------|--------|
| 262 − 300 cent | 220.31 | 없음 |
| 262 + 300 cent | 311.57 | 없음 |
| 440 ± 300 cent | 370.0 / 523.25 | 없음 |
| 330 ± 300 cent | 277.5 / 392.4 | 없음 |

→ 현재 프리셋·`MAX_CENTS=300` 조합에서 클램프는 **안전망**으로만 동작함을 확인.

UI·저장·세션 연동은 아직 없음 (기본 `baseFreq` 440 경로 유지).

## 다음

- **Step B**: 프리셋 AsyncStorage + `settings.tsx` 선택 UI
- **Step C**: 훈련 연동 · 라벨 · 세션 `baseFreq` / `clampCount`

## 성능·부작용

- 클램프·카운트는 `Math.min/max` 수준 — 체감 영향 없음
- `__DEV__`에서만 클램프 로그 — 릴리스 부담 없음
- UI 미연결이므로 사용자 체감 변화 없음
