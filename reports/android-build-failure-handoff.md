# Android 빌드 실패 — 상황 전달용 메모

다른 프롬프트/에이전트에 그대로 붙여넣어 이어서 해결하면 됩니다.

## 프로젝트

- 경로: `D:\harmonic_hear`
- 스택: Expo SDK ~57, React Native 0.86, Android 개발
- package: `com.vlondy.threadsclone` (`app.json`)
- 시작 스크립트: `"start": "npx expo start --dev-client"` → **Expo Go가 아니라 development build 필요**
- OS: Windows 10

## 현재 상황

1. `npx expo run:android`로 Android debug 빌드를 시도함.
2. prebuild는 성공 (`Created native directory`, `Finished prebuild`).
3. Gradle 빌드 중 **실패** → APK/dev client가 에뮬레이터에 설치되지 않음.
4. 그 상태에서 `npm start` → Metro는 뜨지만, Android 열면 아래 에러:
   ```
   CommandError: No development build (com.vlondy.threadsclone) for this project is installed.
   ```
5. 빌드를 다시 시도해도 **같은 지점에서 반복 실패** 중.

## 직접 원인 (Gradle)

실패한 태스크:

```text
:react-native-audio-api:downloadPrebuiltBinaries
```

요약 에러:

```text
Execution failed for task ':react-native-audio-api:downloadPrebuiltBinaries'.
> Process 'command 'C:\Program Files\Git\usr\bin\bash.exe'' finished with non-zero exit value 127
BUILD FAILED
```

스크립트 실행 중 로그 (핵심):

```text
../scripts/download-prebuilt-binaries.sh: line 17: mkdir: command not found
Downloading from: https://github.com/software-mansion-labs/rn-audio-libs/releases/download/v3.1.0/android.zip
curl: (23) client returned ERROR on write of 16384 bytes
Error: Download failed for android.zip.
../scripts/download-prebuilt-binaries.sh: line 104: rm: command not found
```

같은 방식으로 `jniLibs.zip`, `ffmpeg_ios.zip`, `iphoneos.zip`, `iphonesimulator.zip`, `macosx.zip` 등도 다운로드 실패.

관련 패키지: `react-native-audio-api` (`package.json` dependencies, `^0.13.2`)

## 원인 해석

1. Gradle이 `download-prebuilt-binaries.sh`를 **Git Bash** (`C:\Program Files\Git\usr\bin\bash.exe`)로 실행함.
2. 그 bash 환경에서 `mkdir`, `rm`이 PATH에 없어 `command not found` (exit 127).
3. 디렉터리 생성/정리가 안 되니 `curl`이 파일을 쓰지 못해 `curl: (23) write error`가 연쇄 발생.
4. prebuilt 바이너리 다운로드가 실패하면 `react-native-audio-api` 네이티브 빌드가 막히고, 전체 `assembleDebug`가 실패함.
5. 앱이 설치되지 않았으므로 `--dev-client`로 Metro만 켜도 에뮬레이터 실행이 불가.

참고: iOS용 zip(`ffmpeg_ios`, `iphoneos` 등)도 스크립트가 같이 받으려 하지만, 지금 막히는 핵심은 **Windows에서 shell 유틸/`mkdir`/`rm` 부재 + 쓰기 실패** 쪽입니다. Android만 타깃이어도 이 태스크가 깨지면 빌드가 안 됩니다.

## 목표

- `:react-native-audio-api:downloadPrebuiltBinaries`가 성공하도록 고친 뒤
- `npx expo run:android`로 debug 빌드 + 에뮬레이터 설치 성공
- 이후 `npm start` (dev-client)로 Metro 연결

## 조치 완료 (1번 PATH)

- User PATH에 `C:\Program Files\Git\usr\bin` 추가함 (이전에는 `Git\cmd`만 있었음).
- 원인: Gradle이 non-login bash를 띄울 때 Windows PATH만 상속 → `/usr/bin` 미포함 → `mkdir`/`rm` not found.
- 검증: `download-prebuilt-binaries.sh android` 실행 → zip 다운로드/압축 해제 성공 (`EXIT:0`).
- 바이너리는 `node_modules/react-native-audio-api` 아래에 이미 풀려 있어, 다음 빌드에서는 해당 태스크가 스킵될 가능성이 큼.
- **주의:** 이미 열려 있던 터미널은 PATH가 갱신되지 않음 → **터미널을 새로 연 뒤** `npx expo run:android` 실행.

## 남은 시도 (필요 시)

2. Git mingw64 curl PATH 보정 (usr\bin만으로 부족할 때)
3. prebuilt zip 수동 배치
4. `react-native-audio-api` 버전/patch

## 재현 명령

```bash
npx expo run:android
```

또는 Gradle 직접:

```bash
cd android
.\gradlew.bat app:assembleDebug -x lint -x test
```

## 관련 파일

| 경로 | 비고 |
|------|------|
| `package.json` | `react-native-audio-api`, `start`가 `--dev-client` |
| `app.json` | `android.package`: `com.vlondy.threadsclone` |
| `node_modules/react-native-audio-api/.../download-prebuilt-binaries.sh` | 실패 스크립트 |
| `android/build/reports/problems/problems-report.html` | Gradle problems report |

## 성공 기준

- [ ] `downloadPrebuiltBinaries` 성공
- [ ] `assembleDebug` / `expo run:android` 성공
- [ ] 에뮬레이터에 `com.vlondy.threadsclone` 설치됨
- [ ] Metro(`npm start`) 연결 후 앱 실행됨

## 주의

- Android만 개발 중. iOS 관련 설정/수정은 불필요하면 건드리지 말 것.
- 빌드가 성공하기 전에는 Metro만으로 에뮬레이터 실행이 안 됨 (development build 미설치).
