# P0 결함 4건 회귀 테스트 구축 결과

작성일: 2026-08-07
선행 작업: [`reports/p0-fixes-2026-08-07.md`](./p0-fixes-2026-08-07.md)

P0 4건이 향후 작업(특히 제안서 P1 난이도 로직 변경)에서 되살아나지 않도록 테스트로 고정했습니다.
이 프로젝트에서 **jest가 실행된 것은 이번이 처음**입니다.

---

## 결과

```
Test Suites: 5 passed, 5 total
Tests:       86 passed, 86 total
Time:        3.05 s
```

```
npx tsc --noEmit   →  오류 없음
npx eslint (신규 파일 전체)  →  오류·경고 없음
```

---

## 추가·변경 파일

| 파일 | 내용 |
|------|------|
| `src/training/trainingFlow.ts` | **신규.** 훈련 화면 상태 머신 규칙을 순수 함수로 분리 |
| `app/training.tsx` | 위 함수들을 사용하도록 변경 (동작 동일) |
| `src/training/__tests__/trainingFlow.test.ts` | **신규.** P0-1, P0-2 방어 |
| `src/training/__tests__/SessionManager.test.ts` | **신규.** P0-2, P0-3 방어 + 세션 집계 |
| `src/training/__tests__/StaircaseEngine.test.ts` | **신규.** 계단법 규칙 고정 |
| `src/audio/__tests__/AudioEngine.test.ts` | **신규.** P0-4 방어 |
| `src/audio/__tests__/pitchUtils.test.ts` | **신규.** §5.2 검증 수치 고정 |
| `package.json` | jest 설정 보정, `test:ci` 스크립트 추가 |
| `tsconfig.json` | `"types": ["jest"]` |

---

## 1. 상태 머신 분리 (P0-1 테스트를 위한 선행 작업)

P0-1(답변 중복 제출)은 `app/training.tsx`의 `gameState` 게이트라, 그대로 두면
컴포넌트 렌더링 테스트(Skia·Reanimated·expo-router·audio-api 목 필요)를 거쳐야만 검증할 수 있었습니다.

규칙만 `src/training/trainingFlow.ts`로 떼어내 순수 함수로 만들었습니다.

```ts
export function canSubmitAnswer(state: GameState): boolean   // 'waiting'만
export function isReplayPress(state: GameState): boolean     // 'waiting'만
export function canPressPlay(state: GameState): boolean      // 'playing' 제외
export const PLAY_BUTTON_LABEL: Record<GameState, string>
```

`app/training.tsx`는 이 함수들을 호출하도록 바꿨습니다. 동작은 그대로이고,
규칙이 한 지점에 모여 상태 전이가 코드로 문서화됐습니다.

---

## 2. 실제로 재발을 잡는지 확인

테스트를 신뢰하려면 "고친 걸 되돌렸을 때 실패하는가"를 봐야 합니다.
4건 각각을 일시적으로 되돌려 확인했고, **모두 원복했습니다.**

### P0-1 — `canSubmitAnswer`에 `'answered'` 추가

```
✕ 'answered'를 허용하면 안 된다 — 정답 확인 후 반복 제출이 가능해진다
✕ 'answered'에서는 답변을 받지 않는다
✕ 답변을 받는 상태는 정확히 하나뿐이다
```

### P0-2 — `isReplayPress`를 항상 `false`로

```
✕ 'waiting'에서는 다시 듣기(같은 문제)로 동작한다
✕ 다시 듣기로 동작하는 상태는 정확히 하나뿐이다
✕ 답변을 받는 상태와 다시 듣기 상태가 일치한다
```

### P0-3 — `prepareRound`에서 다시 시계를 잡도록

```
✕ prepareRound는 측정을 시작하지 않는다
```

> **테스트를 한 번 보강했습니다.** 처음 작성한 "자극 재생 시간이 포함되지 않는다" 테스트는
> `prepareRound → 2500ms 경과 → openResponseWindow → 답변` 순서라
> 되돌린 코드에서도 **통과했습니다**. `openResponseWindow`가 값을 덮어쓰기 때문입니다.
> 실제 방어선은 "`prepareRound`가 시계를 잡지 않는다"는 단언이므로, 그 의도가 드러나도록
> 테스트 이름과 주석을 고치고 "답변 후 측정 창이 닫힌다"를 추가했습니다.

### P0-4 — 서스테인 앵커 제거 + 램프 종점을 `releaseStart`로

```
✕ Release 시작점에 서스테인 앵커가 있다
✕ 마지막 램프가 톤 끝에서 끝난다
✕ 오프셋만큼 뒤로 밀어 예약한다
```

> **여기서도 보강이 필요했습니다.** 처음 쓴 "서스테인 구간이 톤 길이의 80% 이상"은
> `releaseStart`를 상수(`duration - RELEASE_TIME`)로 계산해서, 앵커가 없어도 **통과했습니다**.
> 실제 예약된 이벤트에서 구간을 도출하도록 바꾸고,
> "Release 직전까지 게인이 피크로 유지된다"를 추가했습니다.

---

## 3. AudioEngine 테스트 방식

`react-native-audio-api`를 목으로 대체해, `GainNode`에 **예약된 자동화 이벤트 목록**을 검사합니다.
실제 소리를 내지 않고 스케줄만 보는 방식입니다.

```
wave 모드 1.0초 톤에 예약되는 이벤트:
  setValueAtTime(0.001, 0.00)     Attack 시작
  expRamp(0.4,     0.05)          Attack 종료
  setValueAtTime(0.4,   0.95)     Sustain 앵커  ← 이게 없으면 P0-4 재발
  expRamp(0.001,   1.00)          Release 종료
```

**함정 하나.** jest 목 팩토리 안에서 TypeScript 파라미터 프로퍼티
(`constructor(private readonly name: string)`)를 쓰면 `babel-plugin-jest-hoist`가
스코프 밖 변수 참조로 오인해 스위트 전체가 실행되지 않습니다. 평범한 할당으로 작성해야 합니다.
파일 상단 주석에 남겨 뒀습니다.

---

## 4. jest 환경 문제와 해결

이 프로젝트에서 jest를 처음 돌렸더니 두 가지가 걸렸습니다.

### `Cannot find module 'expo-modules-core'`

`expo-modules-core@57.0.2`가 **`node_modules/expo/node_modules/` 아래에 중첩 설치**돼 있어
`jest-expo`의 setup이 해석하지 못했습니다. 의존성을 추가하지 않고 해석 경로만 넓혔습니다.

```json
"moduleDirectories": ["node_modules", "<rootDir>/node_modules/expo/node_modules"]
```

### `Haste module naming collision: rn-hear-1`

`files/package.json`이 루트 `package.json`과 이름이 같아 충돌했습니다.
`files/`는 참조용 문서·구버전 설정이 모인 디렉터리이므로 테스트 대상에서 제외했습니다.

```json
"modulePathIgnorePatterns": ["<rootDir>/files/"]
```

### 스크립트

기존 `"test": "jest --watchAll"`은 감시 모드라 CI에서 멈춥니다.
기존 스크립트는 건드리지 않고 `"test:ci": "jest --ci"`를 추가했습니다.

---

## 5. 아직 덮지 못한 것

- **`app/training.tsx`의 타이머 연결.** `openResponseWindow()`가 B 재생 종료 타이머에서
  호출되는지, 재생 시퀀스가 의도한 간격으로 도는지는 테스트가 없습니다.
  규칙(`trainingFlow`)과 계측(`SessionManager`)은 덮었지만, **둘을 잇는 배선은 미검증**입니다.
  컴포넌트 테스트가 필요하며 Skia·Reanimated·expo-router 목이 선행돼야 합니다.
- **실기기 청감 확인.** P0-4는 스케줄만 검증했습니다. 실제 Android에서 톤이 1초 유지되는지,
  서스테인 앵커 때문에 클릭/팝이 생기지 않는지는 여전히 들어봐야 합니다.
- **저장소(`TrainingStorage`) 테스트 없음.** AsyncStorage 목이 필요합니다.
- **CI 없음.** `tsc` + `eslint` + `jest`를 묶어 자동 실행하는 장치가 없어,
  지금은 사람이 기억해서 돌려야 합니다.

---

## 6. 다음 작업에 주는 의미

제안서 2단계(P1-1 반전 기반 역치, P1-3 가변 스텝, P1-2 평가 모드 분기)는
`StaircaseEngine`과 `SessionManager`를 직접 고치는 작업입니다.

`StaircaseEngine.test.ts`가 **현재 규칙을 고정**해 두었으므로,
그 작업에서 어떤 단언이 깨지는지가 곧 "무엇이 의도적으로 바뀌었는지"의 목록이 됩니다.
깨진 테스트는 새 규칙에 맞게 갱신하되, **P0 4건을 지키는 단언은 그대로 통과해야 합니다.**
