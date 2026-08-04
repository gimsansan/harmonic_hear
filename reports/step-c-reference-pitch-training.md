# Step C: 기준음 훈련 연동 — 결과

계획: `docs/기준음_선택과_주파수_클램프_계획.md` §7 Step C  
일시: 2026-08-04

## 계획

- 훈련 시작 시 저장된 프리셋 → `SessionManager` `baseFreq`
- 시각화·배지에 실제 Hz
- 세션 결과에 `baseFreq` · `clampCount`
- wave 우선 (코드 경로 연결; 실기기 청취는 Step D)

## 변경 파일

| 파일 | 내용 |
|------|------|
| `src/training/SessionManager.ts` | `SessionResult`에 `baseFreq?`, `clampCount?` 추가. `endSession`에서 기록 |
| `app/training.tsx` | 포커스/세션 시작 시 `AppSettingsStorage` 로드 → `updateConfig({ baseFreq })`. 배지·시각화 연동 |
| `src/components/SkiaWaveVisualizer.tsx` | `baseFreq` props (기본 `AUDIO.BASE_FREQ`) |
| `src/components/WaveVisualizer.tsx` | 동일 |
| `docs/기준음_선택과_주파수_클램프_계획.md` | Step C 완료 표시 |

## 결과

- 세션 시작 시 프리셋을 다시 읽어 A 재생 Hz가 설정과 일치하도록 연결
- 활성 세션 중에는 포커스 로드로 `baseFreq`를 바꾸지 않음
- 라벨: 고정 `440 Hz` → `{baseFreq} Hz`
- 저장 세션 JSON에 `baseFreq`, `clampCount` 포함 (구버전 세션 필드는 optional)

## 검증 (코드·정적)

- `handleStartSession` → `updateConfig({ baseFreq })` → `startSession` → `prepareRound` 경로 확인
- 고역 프리셋 경로 없음 (Step B UI·상수 그대로)
- Android 실기기에서 262/330 청취·재시작 유지는 **Step D**

## 다음

- **Step D**: `docs/앱_사용법.md` 갱신 · Android 체크리스트

## 성능·부작용

- 세션 시작·화면 포커스 시 AsyncStorage 1회 — 체감 미미
- 정보 배지 3개 + `flexWrap` — 레이아웃만, 렌더 부담 없음
- voice 포먼트(F1/F2 고정)와 저역 조합은 후속 (계획 §9). 1차는 wave
