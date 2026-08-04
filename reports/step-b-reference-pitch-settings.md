# Step B: 기준음 설정 저장·UI — 결과

계획: `docs/기준음_선택과_주파수_클램프_계획.md` §7 Step B  
일시: 2026-08-04

## 계획

- 프리셋 AsyncStorage 저장/로드 (`AppSettingsStorage` 분리)
- `app/settings.tsx` 기준 음고 3행 선택 UI
- 기본값 `standard`(440), 고역 프리셋 미노출

## 변경 파일

| 파일 | 내용 |
|------|------|
| `src/storage/AppSettingsStorage.ts` | 신규. 키 `@harmonitune/reference_pitch_preset`, 값 `standard\|mid\|low`, 기본 `standard`, 잘못된 값 시 fallback |
| `app/settings.tsx` | 고정 440 배지 → `REFERENCE_PRESETS` 3행 선택. 선택 시 즉시 저장·하이라이트 |
| `docs/기준음_선택과_주파수_클램프_계획.md` | Step B 완료 표시 |

## 결과

- 저장 키·값·기본값은 계획 §5.1 / §10과 일치
- UI는 `standard` / `mid` / `low`만 노출 (`PRESET_ORDER` + `REFERENCE_PRESETS` 키)
- 고역 프리셋 행·상수 없음
- 훈련 진입·라벨·세션 메타 연동은 **아직 없음** (Step C)

## 검증 (코드·정적)

- `AppSettingsStorage`가 `TrainingStorage`와 키를 공유하지 않음
- `clearAll`은 훈련 데이터만 삭제 — 기준음 프리셋은 유지
- Android 실기기에서 선택 유지·재시작 확인은 Step D 체크리스트에 남김

## 다음

- **Step C**: 훈련 진입 시 프리셋 → `SessionManager({ baseFreq })`, 시각화 라벨, 세션 `baseFreq` / `clampCount`
- **Step D**: `앱_사용법.md` · Android 체크리스트

## 성능·부작용

- 설정 화면 마운트 시 AsyncStorage 1회 읽기 — 체감 미미
- 선택마다 1회 쓰기 — 설정 화면에서만 발생
- 훈련 화면은 아직 `baseFreq` 미연결이므로 **재생음은 여전히 440**
