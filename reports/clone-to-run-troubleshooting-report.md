# Git Clone 이후 앱 기동까지 — 오류·해결 보고서

| 항목 | 내용 |
|------|------|
| 프로젝트 | HarmoniTune (`harmonic_hear`) |
| 환경 | Windows 10, Android (에뮬레이터 Pixel_7) |
| 스택 | Expo SDK ~57, React Native 0.86, development build (`--dev-client`) |
| 앱 패키지 | `com.vlondy.threadsclone` |
| 작성 목적 | clone 후 첫 기동 과정에서 발생한 오류의 원인·해결을 기록 |

---

## 1. 요약

clone 이후 의존성 설치 → Android 네이티브 빌드 → Metro(dev-client) → 에뮬레이터 실행 과정에서 아래 이슈가 발생했다.

| # | 증상 | 심각도 | 해결 여부 |
|---|------|--------|-----------|
| 1 | Gradle `downloadPrebuiltBinaries` 실패 (`mkdir`/`rm` not found) | 빌드 차단 | ✅ 해결 |
| 2 | PATH 반영 후에도 동일 실패 / `FIND` 오류 | 빌드 차단 → 경고 | ✅ 해결 (환경 재기동) |
| 3 | `No development build ... is installed` | 실행 차단 | ✅ 해결 (빌드 성공 후) |
| 4 | 파형은 나오나 소리 없음 | 기능 장애 | ✅ 해결 (`AudioContext.resume`) |
| 5 | 두 소리 차이가 작게 들림 | 사용성 문의 | 설계상 정상 (이슈 아님) |

**정상 기동 경로 (최종):**

```text
npm install
→ (필요 시) User PATH에 Git\usr\bin 추가 + 터미널/Cursor/Gradle 재시작
→ npx expo run:android   # 또는 npm run android
→ npm start               # Metro --dev-client
→ 에뮬레이터에서 앱 실행
```

---

## 2. 환경·전제

- `package.json`의 `start`는 `npx expo start --dev-client`이다.
- `react-native-audio-api` 등 네이티브 모듈이 있어 **Expo Go로는 실행할 수 없고**, development build(APK)가 기기에 설치되어 있어야 한다.
- Windows에서 해당 패키지는 prebuilt 바이너리 다운로드에 **Git Bash**를 사용한다.

---

## 3. 이슈별 상세

### 이슈 1 — Android 빌드 실패: `downloadPrebuiltBinaries`

#### 증상

```text
> Task :react-native-audio-api:downloadPrebuiltBinaries FAILED

../scripts/download-prebuilt-binaries.sh: line 17: mkdir: command not found
curl: (23) client returned ERROR on write of 16384 bytes
Error: Download failed for android.zip.
../scripts/download-prebuilt-binaries.sh: line 104: rm: command not found

Execution failed for task ':react-native-audio-api:downloadPrebuiltBinaries'.
> Process 'command 'C:\Program Files\Git\usr\bin\bash.exe'' finished with non-zero exit value 127

BUILD FAILED
```

#### 원인

1. Gradle이 `react-native-audio-api`의 `download-prebuilt-binaries.sh`를 Git Bash로 실행함.
2. 시스템/User PATH에 `C:\Program Files\Git\cmd`만 있고 **`C:\Program Files\Git\usr\bin`이 없음**.
3. non-login bash는 Windows PATH만 상속하므로 `mkdir` / `rm` / Unix `find`를 찾지 못함 (exit 127).
4. 임시 디렉터리 생성이 실패해 `curl` 쓰기도 실패 (`curl: (23)`).
5. prebuilt 미확보 → 네이티브 빌드 전체 실패 → 앱 미설치.

#### 해결

1. User PATH에 다음을 추가함:

   ```text
   C:\Program Files\Git\usr\bin
   ```

2. 스크립트를 직접 실행해 다운로드·압축 해제 성공을 확인함 (`EXIT:0`).
3. 이후 `npx expo run:android` 재시도.

#### 관련 경로

- `node_modules/react-native-audio-api/scripts/download-prebuilt-binaries.sh`
- `reports/android-build-failure-handoff.md` (당시 전달용 메모)

---

### 이슈 2 — PATH 수정 후에도 동일 실패 / `FIND` 경고

#### 증상

PATH 추가 직후에도:

```text
mkdir: command not found
FIND: 매개 변수 형식이 틀립니다.
:react-native-audio-api:downloadPrebuiltBinaries FAILED
```

이후 환경 재기동 뒤에는:

```text
> Task :react-native-audio-api:downloadPrebuiltBinaries
FIND: 매개 변수 형식이 틀립니다.

> Task :shopify_react-native-skia:configureCMakeDebug[x86_64]
... (빌드 계속 진행)
```

#### 원인

1. **이미 열려 있던 터미널 / Cursor / Gradle Daemon**이 PATH 변경 전 환경을 유지함.
2. `FIND: 매개 변수 형식이 틀립니다`는 Unix `find` 대신 Windows `FIND`가 호출된 것.
3. 바이너리 폴더가 이미 채워진 뒤에는 다운로드는 스킵되고, 심볼릭 링크 정리 구간의 `find`만 실패해도 태스크가 **통과**하는 경우가 있음 (경고성).

#### 해결

1. 터미널·Cursor를 종료한 뒤 다시 실행 (필요 시 Gradle daemon 정리).
2. 새 환경에서 `npx expo run:android` 재실행.
3. `FIND` 메시지만 있고 `FAILED`가 없으면 **무시 가능** (빌드 본선과 무관).

---

### 이슈 3 — Metro는 뜨지만 앱 실행 불가

#### 증상

```text
› Opening on Android...
› Opening emulator Pixel_7
CommandError: No development build (com.vlondy.threadsclone) for this project is installed.
Install a development build on the target device and try again.
```

#### 원인

1. `npm start`가 `--dev-client` 모드라 Expo Go를 쓰지 않음.
2. 이슈 1·2로 **Android 빌드가 실패한 상태**라 에뮬레이터에 `com.vlondy.threadsclone`이 설치되지 않음.
3. Metro만으로는 JS 번들만 제공할 뿐, 네이티브 앱이 없으면 실행 불가.

#### 해결

1. 이슈 1·2를 해결한 뒤 `npx expo run:android`로 debug 빌드·설치 성공.
2. 이후 `npm start`로 Metro 연결, 설치된 앱으로 실행.

#### 권장 순서 (다음부터)

```text
1) npx expo run:android     # 최초 또는 네이티브 변경 시
2) npm start                # 이후 JS만 수정할 때
```

네이티브 의존성/플러그인 변경 시에만 1)을 다시 수행하면 된다.

---

### 이슈 4 — 파형은 움직이는데 소리가 안 남

#### 증상

- 훈련 화면에서 재생 시 파형(소리 A/B) 애니메이션은 동작.
- 실제 오디오 출력은 없음.
- 에뮬레이터 미디어 볼륨 확인 후에도 무음인 경우가 있었음 (볼륨 이슈와 별개로 코드 측 원인도 존재).

#### 원인

1. `AudioEngine`이 화면 마운트 시 `new AudioContext()`만 호출.
2. `react-native-audio-api`의 AudioContext는 기본이 **`suspended`**일 수 있음.
3. 재생(`oscillator.start`) 전에 **`resume()`을 호출하지 않음**.
4. UI 타이머/시각화는 독립적으로 돌아가므로 “파형만 나오고 소리 없음” 패턴이 나타남.

#### 해결

코드 수정:

| 파일 | 내용 |
|------|------|
| `src/audio/AudioEngine.ts` | `ensureRunning()` 추가 — `state !== 'running'`이면 `await ctx.resume()` |
| `app/training.tsx` | 재생 버튼(사용자 제스처)에서 `ensureRunning()` 후 A→B 시퀀스 시작 |

#### 부가 점검

- 에뮬레이터 **미디어** 볼륨 (벨소리와 별개).
- Cold Boot / 실기기 확인 (에뮬레이터 오디오 경로 문제 가능).

---

### 이슈 5 — 두 소리 차이가 크게 안 남 (문의)

#### 증상

A와 B를 비교해도 높이 차이가 작게 들림.

#### 원인 (버그 아님)

- 초기 격차 `STAIRCASE.INITIAL_CENTS = 50` (반음의 절반).
- 440Hz 기준 약 453Hz 수준으로, 미세 피치 훈련 목적상 의도된 설계.

#### 대응

- 사용법 안내로 설명 (`docs/앱_사용법.md`).
- 오답 시 격차 증가, 연속 정답 시 격차 감소하는 계단법 동작이 정상.

---

## 4. 수정·산출물 목록

| 경로 | 역할 |
|------|------|
| User PATH (`C:\Program Files\Git\usr\bin`) | Windows bash 유틸 인식 |
| `src/audio/AudioEngine.ts` | `ensureRunning` / `resume` |
| `app/training.tsx` | 재생 전 오디오 컨텍스트 기동 |
| `reports/android-build-failure-handoff.md` | 빌드 실패 전달용 메모 |
| `docs/앱_사용법.md` | 초보자 사용 안내 |
| 본 문서 | clone→기동 트러블슈팅 보고서 |

---

## 5. 재발 방지 체크리스트

- [ ] Windows에 Git for Windows 설치, PATH에 `Git\usr\bin` 포함
- [ ] PATH 변경 후 **터미널/IDE/Gradle daemon 재시작**
- [ ] 최초 실행은 `npx expo run:android`로 development build 설치
- [ ] `npm start`만으로 Expo Go를 기대하지 말 것 (`--dev-client`)
- [ ] 무음 시 `AudioContext` resume + 미디어 볼륨 확인
- [ ] `downloadPrebuiltBinaries`의 `FIND` 경고만으로는 실패로 보지 말 것 (`FAILED` 여부 확인)

---

## 6. 결론

clone 후 앱 기동을 막은 핵심은 두 가지였다.

1. **환경:** Git Bash PATH 미비 → `react-native-audio-api` prebuilt 다운로드 실패 → 앱 미설치  
2. **런타임:** AudioContext `resume` 미호출 → UI만 동작하고 무음  

둘 다 조치한 뒤 Android development build 설치와 Metro 연결로 앱을 기동할 수 있었다.
