# 인계: 기준음 선택 · 주파수 클램프 (Step D부터)

새 채팅에서 이 파일 + 아래 문서를 먼저 읽고 **Step D**를 진행한다.

## 필독

| 문서 | 용도 |
|------|------|
| `AGENTS.md` | 작업 후 `docs/`·`reports/` 기록 규칙 |
| `docs/기준음_선택과_주파수_클램프_계획.md` | 전체 계획 (§8 체크리스트, §10 결정) |
| `reports/step-a-reference-pitch-clamp.md` | Step A |
| `reports/step-b-reference-pitch-settings.md` | Step B |
| `reports/step-c-reference-pitch-training.md` | Step C |

## 완료됨 (A–C)

- 프리셋 440 / 330 / 262 + 주파수 클램프 안전망
- 설정 UI + AsyncStorage (`AppSettingsStorage`)
- 훈련: 프리셋 → `baseFreq`, 라벨, 세션 `baseFreq`/`clampCount`

## 다음에 할 일 (Step D)

1. `docs/앱_사용법.md` — 기준음 선택·저역·고주파 배제 설명 한 절 추가
2. Android에서 계획 §8 검증 체크리스트 수행·결과 기록

## 결정 (바꾸지 말 것)

- 중역 330 · 저역 262 · 기본 440
- 클램프 UX: 조용히
- 본훈련 검증: wave 우선

## 새 채팅 시작 프롬프트 예시

```
AGENTS.md와 reports/handoff-reference-pitch-step-d.md 읽고
docs/기준음_선택과_주파수_클램프_계획.md Step D (앱_사용법 + 체크리스트) 해줘.
```
