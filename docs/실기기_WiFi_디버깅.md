# 실기기 WiFi 디버깅 가이드 (Android / Expo 개발 빌드)

> **한 줄 요약**
> PC와 폰을 **같은 WiFi**에 두고, USB 케이블 없이 ADB로 폰을 붙인 다음 Metro에 연결한다.
> WiFi 디버깅은 "이미 폰에 깔린 개발 빌드"를 Metro에 연결하는 일일 뿐이다. 앱이 없으면 먼저 설치한다.

이 프로젝트는 Expo **개발 빌드(development build)** 를 쓴다.
`npm start` = `npx expo start --dev-client`. 일반 Expo Go로는 네이티브 모듈이 맞지 않을 수 있다.

---

## 0. 30초 치트시트

USB로 폰을 한 번 붙였다가, WiFi로 넘기고, 케이블을 뽑는 순서다.

```powershell
# 1) USB로 폰 연결 후
adb devices                       # 실기기가 device 로 보이는지 확인

# 2) (개발 빌드가 아직 없을 때만) 실기기에 설치
npx expo run:android

# 3) 폰 IP 확인 → WiFi ADB로 전환
adb -s <시리얼> shell ip route     # src 뒤가 "폰 IP"
adb -s <시리얼> tcpip 5555
adb connect <폰IP>:5555
adb devices                       # <폰IP>:5555 device 확인

# 4) USB 뽑기 → Metro
npm start                         # 이미 떠 있으면 생략
# 폰에서 앱 실행 → Metro 연결
```

---

## 1. 먼저 이해할 3가지 (여기서 막히는 경우가 대부분)

### ① 개발 빌드가 폰에 먼저 깔려 있어야 한다
WiFi 연결은 앱을 설치해 주지 않는다. 폰에 개발 빌드 APK가 없으면 `npm start`를 해도 열 대상이 없다.
→ 처음 한 번은 `npx expo run:android`로 설치가 필요하다.

### ② `connect`에는 "폰 IP", Metro URL의 IP는 "PC IP"
가장 자주 헷갈리는 지점이다.

| 쓰이는 곳 | 어떤 IP | 예 |
|---|---|---|
| `adb connect <IP>:5555` | **폰 IP** | `172.30.1.71` |
| Metro 로그 / 앱 서버 URL | **PC IP** | `172.30.1.55` |

두 IP는 다르다. `connect`에 PC IP를 넣으면 연결되지 않는다.

### ③ 에뮬용 APK(x86) ≠ 실기기(arm64)
에뮬레이터로 빌드한 APK를 실기기에 넣으면 아래 오류가 난다.

```
INSTALL_FAILED_NO_MATCHING_ABIS: Failed to extract native libraries, res=-113
```

CPU 아키텍처가 다르다는 뜻이다(에뮬 x86 ↔ 폰 arm64).
→ 예전 에뮬용 APK를 재사용하지 말고, 실기기를 타겟으로 다시 빌드한다.

폰 아키텍처 확인:
```powershell
adb -s <시리얼> shell getprop ro.product.cpu.abi   # 보통 arm64-v8a
```

---

## 2. 전제 조건

1. PC에 ADB 설치, 터미널에서 `adb` 동작.
2. 폰: **개발자 옵션 → USB 디버깅** ON.
3. PC와 폰이 **같은 WiFi**.
4. 실기기에 **개발 빌드 APK** 설치되어 있음(없으면 3단계에서 설치).

---

## 3. 단계별 상세

### 3-1. USB로 연결 확인
```powershell
adb devices
```
```
List of devices attached
RF8MC0XZYLK     device          ← 실기기
emulator-5554   device          ← 있으면 끄는 것을 권장 (기기 혼동 방지)
```
- `device`로 떠야 정상. `unauthorized`면 폰 화면에서 USB 디버깅 허용을 수락.
- 실기기와 에뮬이 **둘 다** 있으면, 이후 명령에 `-s <시리얼>`을 붙이거나 에뮬을 끈다.

### 3-2. 개발 빌드 설치 (없을 때만, 실기기만 연결한 상태에서)
```powershell
npx expo run:android
```
기기가 하나뿐이면 그 기기를 자동 선택한다. 성공 로그 예:
- `BUILD SUCCESSFUL`
- `Installing ...\app-debug.apk`
- `Opening ... on <기기명>`
- `Android Bundled ...`

> **`-d`(`--device`) 참고**
> `--device`는 값 없이 쓰면 기기 목록에서 고르게 하고, 값을 주면 기기를 매칭한다.
> 값 매칭 방식(이름/시리얼)은 CLI 버전에 따라 다를 수 있다.
> → **실기기가 하나면 값 없이** `npx expo run:android`만 쓰는 것을 권장한다.
> `-d <시리얼>`이 `Could not find device with name...`으로 실패하면 이 경우다.

이미 실기기용으로 빌드된 APK가 있을 때만:
```powershell
adb -s <시리얼> install -r android\app\build\outputs\apk\debug\app-debug.apk
```

### 3-3. 폰 IP 확인
USB로 붙은 상태에서:
```powershell
adb -s <시리얼> shell ip route
```
```
172.30.1.0/24 dev wlan0 ... src 172.30.1.71
```
`src` 뒤 주소가 **폰 IP**다(예: `172.30.1.71`).
폰 `설정 > WiFi > 연결된 네트워크`에서도 확인 가능하다.

### 3-4. WiFi ADB로 전환
USB가 연결된 상태에서:
```powershell
adb -s <시리얼> tcpip 5555
adb connect <폰IP>:5555
```
```
restarting in TCP mode port: 5555
connected to 172.30.1.71:5555
```
확인 후 USB 케이블을 뽑는다. 이후에는 보통 이것만 남는다:
```
172.30.1.71:5555    device
```

> **`tcpip`가 `no devices/emulators found`인 경우**
> `tcpip`는 **USB로 붙은 기기**에 보내는 명령이다. USB를 이미 뽑았으면 실패한다.
> 단, 예전에 `tcpip 5555`를 해 뒀고 폰이 재부팅되지 않았다면 `adb connect <폰IP>:5555`만으로 붙을 수 있다.

### 3-5. Metro 실행
```powershell
npm start        # = npx expo start --dev-client
```
- PC·폰 **같은 WiFi** 필수.
- 폰에서 설치된 개발 빌드 앱을 연다.
- 자동 연결이 안 되면 앱 개발 메뉴에서 서버 URL을 **PC IP**로 지정: 예 `http://172.30.1.55:8081`.

> **Metro가 이미 다른 터미널에 떠 있으면 다시 켜지 않는다.**
> 그대로 쓰려면 폰에서 앱만 연다. 새로 시작하려면 기존 터미널에서 `Ctrl+C` 후 `npm start`.
> `expo run:android`로 설치까지 끝나면서 Metro가 함께 떠 있다면, WiFi ADB만 전환하고 그 Metro를 그대로 쓰면 된다.

---

## 4. 대안: Android 11+ 무선 디버깅 (USB 없이 페어링)

USB 없이 처음부터 무선으로 붙이는 방법이다.

1. 폰: `설정 > 개발자 옵션 > 무선 디버깅` ON
2. "페어링 코드로 기기 페어링"에서 `IP:포트`와 6자리 코드 확인
3. PC:
```powershell
adb pair 192.168.x.x:<페어링포트>      # 6자리 코드 입력
adb connect 192.168.x.x:<연결포트>
```

> **페어링 포트 ≠ 연결 포트.** `connect`에는 무선 디버깅 **메인 화면**에 표시된 포트를 쓴다.

---

## 5. 트러블슈팅

| 증상 | 원인 | 대응 |
|---|---|---|
| `adb devices`에 에뮬만 있음 | 실기기 USB/디버깅 미연결 | USB 연결, USB 디버깅 ON |
| `Could not find device with name: RF8...` | `-d`가 값을 이름처럼 찾음 | `-d` 없이 `npx expo run:android` |
| `INSTALL_FAILED_NO_MATCHING_ABIS` | 에뮬(x86) APK를 실기기(arm64)에 설치 | 실기기 타겟으로 재빌드 |
| `adb tcpip` → `no devices` | USB가 이미 빠짐 | USB 연결 후 `tcpip`, 또는 기존 5555에 `adb connect` |
| Metro 연결 안 됨 | WiFi 다름 / PC IP 오입력 / Metro 미실행 | 같은 WiFi 확인, 앱 URL에 **PC IP** 입력, Metro 실행 |
| 기기 두 개라 명령이 엉뚱한 곳으로 감 | 에뮬+실기기 동시 | 에뮬 끄기 또는 `-s <시리얼>` 지정 |
| WiFi인데도 앱이 서버를 못 찾음 | LAN 검색 실패 | (대안) `adb -s <폰IP>:5555 reverse tcp:8081 tcp:8081` 후 앱 URL을 `localhost:8081`로 지정 |

---

## 6. 이 프로젝트 메모

- 시작 스크립트: `package.json` → `"start": "npx expo start --dev-client"`
- Android 패키지: `com.vlondy.harmonitune` (`app.json`)
- **JS만 수정** → Metro 리로드로 충분한 경우가 많다.
- **네이티브 코드·의존성·`.riv` 등 변경** → 재빌드(`npx expo run:android`)가 필요할 수 있다.

---

## 7. 교차 검증 결과 (2026-08 기준)

Expo 공식 문서와 대조해 확인한 내용이다.

- **정확함(수정 불필요):**
  실기기는 `--device` 플래그로 설치 / `--dev-client`가 개발 빌드 기본 실행 대상 /
  ABI 불일치 오류 / ADB `tcpip`·`connect` 흐름 / PC IP·폰 IP 구분 /
  Android 11+ 무선 디버깅에서 페어링 포트와 연결 포트가 다름.
- **수정한 부분:**
  원본은 "`-d`는 ADB 시리얼이 아니라 기기 이름을 찾는다"고 단정했으나,
  값 매칭 방식은 CLI 버전에 따라 다를 수 있어 **"기기가 하나면 값 생략 권장"** 으로 완화했다.
- **추가한 부분:**
  WiFi에서도 검색이 실패할 때의 대안으로 `adb reverse tcp:8081` + `localhost:8081` 방식(5번 표 마지막 행).
