# 인계: 기준음 선택 · 주파수 클램프 (Step C부터)

새 채팅에서 이 파일 + 아래 문서를 먼저 읽고 **Step C**를 진행한다.

## 필독

| 문서 | 용도 |
|------|------|
| `AGENTS.md` | 작업 후 `docs/`·`reports/` 기록 규칙 |
| `docs/기준음_선택과_주파수_클램프_계획.md` | 전체 계획 (§10 결정 확정) |
| `reports/step-a-reference-pitch-clamp.md` | Step A 완료 결과 |
| `reports/step-b-reference-pitch-settings.md` | Step B 완료 결과 |

## 완료됨

### Step A
- `REFERENCE_PRESETS`: standard **440** / mid **330** / low **262** (고역 없음)
- `AUDIO.FREQ_MIN_HZ=200`, `FREQ_MAX_HZ=2000`
- `clampFreq` · `StaircaseEngine` 클램프 + `getClampCount()`

### Step B
- `AppSettingsStorage` — 키 `@harmonitune/reference_pitch_preset`
- `app/settings.tsx` — 3행 선택 UI (고역 미노출)
- **훈련 연동 아직 없음** → 재생은 여전히 기본 440

## 다음에 할 일 (Step C)

1. 훈련 진입 시 프리셋 → `SessionManager({ baseFreq })`
2. 시각화 라벨을 실제 `baseFreq`로
3. 세션 결과에 `baseFreq` · (권장) `clampCount`
4. wave 우선 검증

패턴은 `app/training.tsx`, `SessionManager`, `WaveVisualizer` / `SkiaWaveVisualizer`를 읽고 맞출 것.

## 이어서 (Step D)

- `docs/앱_사용법.md` 갱신 → Android 체크리스트

## 결정 (바꾸지 말 것)

- 중역 330 · 저역 262 · 기본 440
- 클램프 UX: 조용히
- 본훈련 검증: wave 우선 (voice 포먼트 후속)

## 새 채팅 시작 프롬프트 예시

```
AGENTS.md와 reports/handoff-reference-pitch-step-c.md 읽고
docs/기준음_선택과_주파수_클램프_계획.md Step C 구현해줘.
```
