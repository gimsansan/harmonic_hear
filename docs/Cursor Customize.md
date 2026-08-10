# Cursor Customize 설정 가이드

작성일: 2026-08-10
대상: 사이드바 → Customize 안의 7개 탭 (Plugins, MCPs, Skills, Subagents, Rules, Commands, Hooks)
출처: Cursor 공식 문서 (`cursor.com/docs`, `cursor.com/help`) 기준. 문서에서 확인 안 된 항목은 10장에 따로 표시했다.

---

## 0. 먼저 큰 그림

7개 탭은 전부 "에이전트를 내 방식대로 길들이는" 수단이다. 다만 층이 다르다.

| 층 | 항목 | 한 줄 요약 |
|---|---|---|
| 말투·규칙 | **Rules** | 에이전트가 항상 지켜야 할 지침 |
| 절차 | **Skills** | 여러 단계짜리 작업 방법을 가르침 |
| 호출 | **Commands** | `/`로 부르는 재사용 프롬프트 (구버전, Skills로 대체 중) |
| 일꾼 | **Subagents** | 별도 컨텍스트에서 일하는 보조 에이전트 |
| 외부 연결 | **MCPs** | DB·Notion·Figma 등 외부 도구 연결 |
| 자동화 | **Hooks** | 특정 시점에 자동 실행되는 스크립트 |
| 포장 | **Plugins** | 위의 것들을 묶어 배포하는 패키지 |

**처음이라면 Rules만 잘 써도 충분하다.** 나머지는 필요해질 때 하나씩 열어보면 된다.

---

## 1. Rules — 가장 중요하고, 가장 먼저 손댈 것

### 무엇인가

에이전트가 매 대화에서 지켜야 할 지침. 코드 컨벤션, 답변 언어, 금지 사항 등을 넣는다.

### 4가지 종류와 저장 위치

| 종류 | 저장 위치 | 적용 범위 | git 공유 |
|---|---|---|---|
| Team Rules | Cursor 서버 | 팀 전체 | 자동 동기화 |
| Project Rules | `.cursor/rules/*.mdc` | 해당 프로젝트 | 가능 |
| User Rules | **Cursor 설정 내부 (파일 없음)** | 내 컴퓨터의 모든 프로젝트 | **불가** |
| AGENTS.md | 프로젝트 루트 및 하위 폴더 | 해당 폴더와 그 하위 | 가능 |

충돌하면 **Team → Project → User** 순으로 앞쪽이 이긴다.

> **User Rules는 파일로 저장되지 않는다.** 프로필 내보내기에도 안 들어간다.
> 컴퓨터를 바꾸면 처음부터 다시 입력해야 하니, 내용을 별도 md에 복사해 두는 것을 권한다.

### 어디서 편집하나

사이드바 → **Customize** → **Rules**

- **User Rules**: 자유 텍스트 입력란. 입력하면 자동 저장
- **Project Rules**: `.cursor/rules/`의 `.mdc` 파일 목록. **Add Rule** 버튼으로 추가
- GitHub에서 가져오기: Add Rule → **Remote Rule (Github)** → 리포 URL

만드는 다른 방법: 채팅에 `/create-rule`, 또는 `Ctrl+Shift+P` → "New Cursor Rule"

### Project Rule의 4가지 적용 방식

`.mdc` 파일 맨 위 frontmatter 조합으로 결정된다.

| UI 이름 | `alwaysApply` | `description` | `globs` | 언제 붙나 |
|---|---|---|---|---|
| Always Apply | `true` | — | — | 항상 |
| Apply to Specific Files | `false` | — | 있음 | 매칭 파일이 열려 있을 때 |
| Apply Intelligently | `false` | 있음 | 없음 | 에이전트가 관련 있다고 판단할 때 |
| Apply Manually | `false` | 없음 | 없음 | `@rule-name`으로 부를 때만 |

예시:

```markdown
---
description: 오디오 재생 코드를 수정할 때의 규칙
globs: src/audio/**/*.ts
alwaysApply: false
---

- AudioContext는 사용자 제스처 시점에 resume한다.
- 여러 톤의 간격이 중요하면 playSequence를 쓴다.
```

glob 패턴은 콤마로 여러 개를 나열할 수 있다 (`src/**/*.ts, src/**/*.tsx`).

> **`.cursor/rules` 안에 `.md`를 넣으면 무시된다.** frontmatter를 못 쓰기 때문이다.
> 반드시 `.mdc` 확장자를 쓰고, 평문 마크다운을 원하면 `AGENTS.md`를 쓴다.

### 무엇을 어디에 넣을까

**User Rules** (모든 프로젝트 공통, 개인 취향)

- 답변 언어, 말투, 길이
- 개인적인 코딩 선호
- "확인 없이 파일 고치지 말 것" 같은 작업 방식

**Project Rules / AGENTS.md** (이 프로젝트에만, 팀 공유)

- 이 코드베이스의 구조·도메인 지식
- 기록을 어디에 남기는지
- 플랫폼 제약 (예: 안드로이드 우선)

### 좋은 rule 쓰는 법 (공식 권장)

**하면 좋은 것**

- 500줄 이하로 유지, 길면 여러 파일로 분할
- 파일 내용을 복사하지 말고 `@파일명`으로 **참조** — 코드가 바뀌어도 안 낡는다
- 모호한 말 대신 내부 문서처럼 명확하게
- 같은 실수가 **반복될 때** 룰을 추가 (미리 과하게 만들지 말 것)

**하면 안 되는 것**

- 스타일 가이드 전체 복사 → 린터가 할 일
- npm, git 같은 일반 명령어 설명 → 이미 안다
- 거의 안 생기는 엣지 케이스
- 코드베이스에 이미 있는 내용 중복

### Rules가 안 먹는 곳

- **Cursor Tab (자동완성)**: 적용 안 됨
- **Inline Edit (Ctrl+K)**: User Rules 적용 안 됨
- **Bugbot PR 리뷰**: 적용 안 됨

Rules는 **채팅(Agent) 전용**이다.

---

## 2. Skills — 절차를 가르치기

### 무엇인가

"이 작업은 이렇게 해라"를 단계별로 적어둔 패키지. `SKILL.md` 파일 하나가 최소 단위이고, 스크립트나 참고 문서를 같이 넣을 수 있다.

### 언제 쓰나

- 여러 단계짜리 반복 작업 (테스트 → 빌드 → 배포 → 검증)
- 스크립트 실행이 끼는 작업
- 특정 파일 타입에만 적용되는 상세한 작성 규약

### 만드는 법

가장 쉬운 건 채팅에 `/create-skill` 입력. 수동으로는 `.cursor/skills/<이름>/SKILL.md`

```markdown
---
name: deploy-app
description: 앱을 스테이징에 배포한다. 배포나 릴리스 얘기가 나오면 사용.
paths:
  - "**/*.tsx"
disable-model-invocation: false
---

# 배포 절차

1. `npm test`
2. `scripts/deploy.sh staging`
```

| 필드 | 필수 | 설명 |
|---|---|---|
| `name` | 예 | 소문자·숫자·하이픈. **폴더명과 같아야 한다** |
| `description` | 예 | 무엇을·언제. 에이전트가 이걸 보고 쓸지 판단 |
| `paths` | 아니오 | glob. 매칭 파일 작업 시에만 노출 |
| `disable-model-invocation` | 아니오 | `true`면 `/이름`으로 직접 부를 때만 |

선택 폴더: `scripts/`(실행 코드), `references/`(필요할 때만 로드되는 문서), `assets/`(템플릿)

### Rules와 뭐가 다른가

- **Rule**: 짧은 지침. 매번 컨텍스트에 들어간다. 스크립트 못 넣는다
- **Skill**: 긴 절차. 필요할 때만 로드된다. 스크립트를 넣을 수 있다

판단 기준은 간단하다. **한두 줄 지시로 끝나면 Rule, 따라야 할 순서가 있으면 Skill.**

### 흔한 실수

- `name`과 폴더명이 다름 → 로드 안 됨
- `description`이 부실함 → 에이전트가 스킬을 안 쓴다 (여기가 트리거 지점)
- `SKILL.md`가 너무 김 → 상세 내용은 `references/` 폴더로 분리

---

## 3. Subagents — 일 나눠주기

### 무엇인가

**별도의 컨텍스트 창**을 가진 보조 에이전트. 메인 대화를 더럽히지 않고 일을 시킬 수 있다.

### 언제 쓰나

- 코드베이스를 넓게 뒤져야 하는데 메인 대화 컨텍스트를 아끼고 싶을 때
- 여러 작업을 병렬로 돌릴 때
- 끝난 작업을 독립적으로 검증하고 싶을 때

기본 제공(설정 불필요): `explore`(탐색), `bash`(셸), `browser`(브라우저)

### 만드는 법

`.cursor/agents/<이름>.md`

```markdown
---
name: security-auditor
description: 보안 전문가. 인증·결제·민감정보 다룰 때 사용.
model: inherit
readonly: true
---

너는 취약점을 찾는 보안 전문가다.
```

| 필드 | 기본값 | 설명 |
|---|---|---|
| `model` | `inherit` | 부모와 같은 모델을 쓰거나 따로 지정 |
| `readonly` | `false` | `true`면 파일 수정 불가 |
| `is_background` | `false` | `true`면 백그라운드 실행 |

### Skills와 뭐가 다른가

핵심은 **컨텍스트 창이 분리되느냐**다. Skill은 지금 대화 안에서 실행되고, Subagent는 새 창에서 시작해 결과만 돌려준다.

### 흔한 실수

- 5개 병렬로 돌리면 토큰도 약 5배. 간단한 일은 메인이 더 빠르다
- 모호한 서브에이전트를 수십 개 만들기 → **2~3개로 시작**하라는 게 공식 권장
- 서브에이전트가 이전 대화를 안다고 가정 → **깨끗한 상태로 시작**하므로 배경을 다 적어줘야 한다

---

## 4. MCPs — 외부 도구 연결

### 무엇인가

에이전트가 호출할 수 있는 외부 툴을 추가하는 연결 규격. DB, Notion, Figma, Jira, 사내 API 등.

### 설정

`.cursor/mcp.json` (프로젝트) 또는 `~/.cursor/mcp.json` (전역)

```json
{
  "mcpServers": {
    "local-server": {
      "command": "python",
      "args": ["${workspaceFolder}/tools/mcp_server.py"],
      "env": { "API_KEY": "${env:API_KEY}" }
    }
  }
}
```

쓸 수 있는 변수: `${env:이름}`, `${userHome}`, `${workspaceFolder}` 등

### 흔한 실수

- **API 키 하드코딩** → `${env:...}` 보간을 쓴다
- 서버를 많이 켜두면 툴 목록이 지저분해진다. 안 쓰는 건 Customize에서 토글로 끈다
- 디버깅: `Ctrl+Shift+U` → **MCP Logs**

---

## 5. Hooks — 자동 실행 스크립트

### 무엇인가

에이전트가 파일을 고치거나 셸 명령을 실행하는 등 **특정 시점**에 자동으로 끼어드는 스크립트. 관찰·차단·수정이 가능하다.

### 언제 쓰나

- 파일 편집 후 자동 포매터 실행
- 위험한 명령 차단 (예: `rm -rf`, DB write)
- 시크릿·개인정보 스캔
- 감사 로그 수집

### 설정

`.cursor/hooks.json` (프로젝트) 또는 `~/.cursor/hooks.json` (전역)

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [{ "command": ".cursor/hooks/format.sh" }],
    "beforeShellExecution": [
      {
        "command": ".cursor/hooks/check.sh",
        "matcher": "curl|wget",
        "failClosed": true
      }
    ]
  }
}
```

채팅에 `/create-hook`을 치면 만들어 준다.

### 흔한 실수 (경로가 1위)

- **프로젝트 훅은 프로젝트 루트에서 실행된다** → `.cursor/hooks/format.sh`
- **사용자 훅은 `~/.cursor/`에서 실행된다** → `./hooks/format.sh`
- 이걸 헷갈리면 훅이 조용히 실패한다
- 스크립트에 실행 권한 필요 (`chmod +x`)
- **훅이 실패해도 기본은 그냥 진행(fail-open)** 이다. 막으려면 `failClosed: true` 또는 exit code 2

---

## 6. Commands — `/`로 부르는 프롬프트

### 무엇인가

채팅에서 `/`로 호출하는 재사용 프롬프트. `.cursor/commands/`에 마크다운으로 둔다.

### 지금 상태 (중요)

Cursor 공식 문서에 **Commands 전용 페이지가 없다.** 현재 문서에서 Commands는 주로 **Skills로 옮길 대상**으로 다뤄지고, `/migrate-to-skills`라는 변환 도구까지 제공된다.

**새로 만들 거면 Commands 대신 Skills를 쓴다.** 기존에 만들어 둔 게 있으면 그대로 써도 되고, 마이그레이션 명령으로 옮길 수 있다.

---

## 7. Plugins — 묶음 배포

### 무엇인가

Rules, Skills, Subagents, Commands, MCP, Hooks를 하나로 묶어 배포하는 패키지. 마켓플레이스에서 설치한다.

### 언제 쓰나

- 검증된 설정 세트를 한 번에 받고 싶을 때
- 팀 전체에 동일한 환경을 배포하고 싶을 때 (Teams/Enterprise)

### MCP와 뭐가 다른가

- **MCP**는 외부 연결 하나
- **Plugin**은 MCP를 포함해 여러 컴포넌트를 묶은 배포 단위

즉 MCP는 Plugin 안에 들어갈 수 있는 부품이다.

---

## 8. 이 프로젝트(harmonic_hear)의 현재 상태

2026-08-10 기준으로 확인한 결과다.

| 항목 | 상태 |
|---|---|
| AGENTS.md | 있음 — 기록 위치(`docs/`, `reports/`), 코드 패턴, 안드로이드 우선 |
| `.cursor/rules/` | **없음** |
| `.cursor/skills/` | 없음 |
| `.cursor/mcp.json` | 없음 |
| `.cursor/hooks.json` | 없음 |
| User Rules | 13개 정도 설정되어 있음 |

프로젝트 지식은 AGENTS.md, 개인 취향은 User Rules로 분리되어 있다. 이 구성이면 당장 더 만들 건 없다.

---

## 9. 현재 User Rules 진단

### 잘 하고 있는 것

지금 넣어둔 것들은 대부분 "답변 형식 트리거"다. 공식 권장이 "User Rules에는 커뮤니케이션 스타일을 넣어라"이므로 **위치 선택이 맞다.** 프로젝트 지식을 여기 안 섞은 것도 좋다.

### 고치면 좋을 것

**(1) 짧게 답하라는 규칙이 여러 개로 겹친다**

현재: `??` → short / `초` → very succinct / `short answer` / `simple` / 기본도 simple

트리거가 다섯인데 서로 얼마나 다른지가 규칙 안에 안 적혀 있다. 에이전트 입장에서 `??`와 `simple`의 차이를 알 수 없다. 길이 단계를 명시적으로 묶는 것을 권한다.

```text
답변 길이는 다음 신호를 따른다.
- 기본: 3~5문장
- "simple" 또는 "??" 로 끝남: 1~2문장
- "초" 로 끝남: 한 문장. 답변을 "초"로 시작한다.
- 아무 신호 없이 설명을 요청하면: 제한 없음
```

**(2) 뜻이 불분명한 규칙이 있다**

`Step 1: Double-sided description (both sides) └- One change + technology + UX (medium)`

읽어도 무엇을 어떤 형식으로 내라는 건지 모호하다. `Comparison Analysis Both-sided`와 어떻게 다른지도 불분명하다. 원하는 출력 예시를 3~4줄이라도 붙여두면 훨씬 안정적으로 동작한다.

**(3) 모호한 금지 규칙**

`Please don't edit it in advance in agent mode`

"in advance"의 기준이 없다. 아래처럼 조건을 명시하는 게 낫다.

```text
Agent 모드에서 파일을 수정하기 전에, 무엇을 어떻게 바꿀지 먼저 설명하고 승인을 받는다.
단, 사용자가 명시적으로 "수정해줘"라고 한 경우는 바로 진행한다.
```

**(4) 백업이 없다**

User Rules는 파일로 저장되지 않고 프로필 내보내기에도 안 들어간다. 컴퓨터를 바꾸면 전부 사라진다. 지금 내용을 `docs/`에 사본으로 남겨둘 것.

---

## 10. 확인 안 된 것

추측으로 채우지 않고 남겨둔다.

- Commands의 사용자 전역 경로 (`~/.cursor/commands` 여부) — 공식 문서에 없음
- AGENTS.md가 Team/Project/User Rules 대비 정확히 어느 우선순위인지 — 공식 우선순위 표에 빠져 있음
- Customize 각 탭의 세부 UI 배치 — 문서화되어 있지 않음
- Subagents 탭에서 GUI로 생성하는 절차 — 문서는 파일 직접 생성 방법만 안내함


---
`docs/Cursor Customize.md`에 채웠습니다. 총 10장 구성입니다.

- **0장** 7개 항목 한눈에 보기 (어떤 층의 기능인지)
- **1~7장** 각 항목별 무엇인지 / 언제 쓰는지 / 어떻게 만드는지 / 흔한 실수
- **8장** 이 프로젝트의 현재 설정 상태 (`AGENTS.md`만 있고 `.cursor/` 하위는 아직 없음)
- **9장** 지금 User Rules 진단
- **10장** 공식 문서에서 확인 안 된 항목

Rules를 1장에 두고 가장 길게 잡았습니다. 나머지 여섯 개는 당장 안 만들어도 되는 것들이라 "이게 뭔지 알고, 필요해지면 여기를 본다" 수준으로 정리했습니다.

9장 진단에서 짚은 핵심은 짧게 답하라는 트리거가 `??`, `초`, `short answer`, `simple`, 그리고 기본값까지 다섯 갈래인데 서로의 차이가 규칙에 안 적혀 있다는 점입니다. 문장 수로 단계를 못 박는 대체 문구를 예시로 넣어뒀습니다.
```
 아직 안 한 것이 하나 있습니다. User Rules는 파일로 저장되지 않아서 컴퓨터를 바꾸면 사라지는데, 백업 사본은 만들지 않았습니다. 지금 설정하신 13개 규칙을 `docs/`에 그대로 옮겨 적어둘까요?
 ```
---