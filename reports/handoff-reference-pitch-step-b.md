# 인계: 기준음 선택 · 주파수 클램프 (Step B부터)

새 채팅에서 이 파일 + 아래 문서를 먼저 읽고 **Step B**를 진행한다.

## 필독

| 문서 | 용도 |
|------|------|
| `AGENTS.md` | 작업 후 `docs/`·`reports/` 기록 규칙 |
| `docs/기준음_선택과_주파수_클램프_계획.md` | 전체 계획 (§10 결정 확정) |
| `reports/step-a-reference-pitch-clamp.md` | Step A 완료 결과 |

## 완료됨 (Step A)

- `REFERENCE_PRESETS`: standard **440** / mid **330** / low **262** (고역 없음)
- `AUDIO.FREQ_MIN_HZ=200`, `FREQ_MAX_HZ=2000`
- `clampFreq` in `src/audio/pitchUtils.ts`
- `StaircaseEngine`: `targetFreq` 클램프, `getClampCount()`, reset 시 초기화
- 경계 검증: 프리셋 ±300 cent는 모두 한도 안 (클램프는 안전망)
- UI·저장·훈련 연동 **아직 없음** → 사용자는 여전히 항상 440

## 다음에 할 일 (Step B)

1. 프리셋 AsyncStorage 저장/로드  
   - 키: `@harmonitune/reference_pitch_preset`  
   - 값: `"standard" | "mid" | "low"`  
   - 기본값: `standard`  
   - `AppSettingsStorage` 분리 권장 (`TrainingStorage`와 혼선 방지)
2. `app/settings.tsx` — 기준 음고를 **선택 UI**로 (3행 또는 세그먼트, 설정 톤에 맞춤)
3. 고역 프리셋 노출 금지

패턴은 기존 `app/settings.tsx`, `src/storage/TrainingStorage.ts`를 읽고 맞출 것.

## 이어서 (Step C → D)

- 훈련 진입 시 프리셋 → `SessionManager({ baseFreq })`
- 시각화 라벨을 실제 `baseFreq`로
- 세션 결과에 `baseFreq` · (권장) `clampCount`
- wave 우선 검증 → `docs/앱_사용법.md` 갱신 → Android 체크리스트

## 결정 (바꾸지 말 것)

- 중역 330 · 저역 262 · 기본 440
- 클램프 UX: 조용히
- 본훈련 검증: wave 우선 (voice 포먼트 후속)

## 새 채팅 시작 프롬프트 예시

```
AGENTS.md와 reports/handoff-reference-pitch-step-b.md 읽고
docs/기준음_선택과_주파수_클램프_계획.md Step B 구현해줘.
```
