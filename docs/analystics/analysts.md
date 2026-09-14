# Recipebook Metrics & Product Analytics Implementation Plan

## 0. 문서 목적

이 작업의 목적은 Recipebook에 새로운 기능을 많이 추가하는 것이 아니다.

현재 서비스의 핵심 흐름과 AI 구조화 기능을 **실제로 측정 가능한 상태**로 만들고, 이후 개선 전후를 객관적인 수치로 비교할 수 있는 최소한의 측정 기반을 구축한다.

이번 작업에서 반드시 확보해야 하는 결과는 다음 세 가지다.

1. AI 레시피 구조화 **성공률**
2. AI 레시피 구조화 **응답 시간**
3. 사용자의 핵심 레시피 저장 흐름을 관찰할 수 있는 **Product Analytics Event**

최종적으로 다음 형태의 질문에 실제 데이터로 답할 수 있어야 한다.

```text
AI 구조화 요청 중 몇 %가 정상 Schema를 만족하는가?

AI 구조화에는 평균적으로 얼마나 시간이 걸리는가?
p50 / p95는 얼마인가?

사용자는
입력 → AI 구조화 → 결과 확인/수정 → 저장
과정 중 어디까지 도달하는가?

입력 유형(URL / 직접 입력 / 혼합)에 따라
AI 결과 수정 비율이나 저장 흐름에 차이가 있는가?
```

---

# 1. 작업 원칙

## 1.1 기존 코드부터 분석한다

구현을 시작하기 전에 현재 Repository를 먼저 분석한다.

반드시 다음을 확인한다.

* Frontend 구조
* Backend 구조
* DB 및 ORM/Query 방식
* Recipe AI 구조화 요청 위치
* OpenAI 호출 위치
* Recipe 구조화 Schema
* Auth 처리 방식
* Recipe 저장 API
* 현재 logging 방식
* 테스트 환경
* 기존 analytics / event 관련 코드 존재 여부

기존 구현이 있다면 재사용한다.

새로운 구조를 먼저 만들지 않는다.

---

## 1.2 최소 변경을 우선한다

이번 작업은 Analytics 플랫폼 구축 프로젝트가 아니다.

따라서 다음을 피한다.

* 불필요한 Analytics SaaS 도입
* 과도한 abstraction
* 범용 Event Bus 구축
* Kafka 등 별도의 event infrastructure
* 필요 이상의 dashboard 구축
* 복잡한 CQRS/Event Sourcing
* 대규모 logging framework 추가

현재 프로젝트의 DB와 Backend를 사용할 수 있다면 이를 우선한다.

---

## 1.3 측정값을 만들어내지 않는다

모든 수치는 반드시 실제 실행 결과여야 한다.

절대로 다음과 같은 값을 임의로 작성하지 않는다.

```text
성공률 약 95%
응답시간 약 3초
성능 20% 개선
```

실제 측정 결과가 없다면 문서에는 다음과 같이 남긴다.

```text
Not measured yet
```

---

## 1.4 Raw 사용자 입력을 Analytics에 저장하지 않는다

Analytics Event에는 다음을 저장하지 않는다.

* 레시피 원문
* 사용자 작성 메모
* access token
* Firebase token
* Authorization header
* 이메일
* 이름
* 외부 URL 전체 문자열
* OpenAI prompt 전체
* OpenAI response 전체

Analytics의 목적은 **행동과 상태 측정**이지 사용자 콘텐츠 저장이 아니다.

---

# 2. 전체 작업 단계

작업은 다음 순서로 진행한다.

```text
Phase 0
Repository 분석

Phase 1
AI Structure Benchmark 구축

Phase 2
Product Analytics Event Spec 작성

Phase 3
Analytics Event 수집 infrastructure 구현

Phase 4
Recipe 핵심 Funnel instrumentation

Phase 5
실제 측정

Phase 6
Baseline 분석

Phase 7
한 가지 개선 실행

Phase 8
Before / After 재측정

Phase 9
결과 문서화
```

각 Phase 완료 후 다음 단계로 넘어간다.

---

# 3. Phase 0 — Repository 분석

구현 전에 현재 코드 구조를 조사한다.

조사 결과를 다음 파일에 기록한다.

```text
docs/metrics/current-architecture.md
```

최소한 다음 내용을 기록한다.

```md
# Current Architecture

## Frontend

- framework:
- state management:
- API client:
- routing:

## Backend

- framework:
- recipe structure endpoint:
- recipe save endpoint:

## Database

- database:
- ORM / query layer:

## AI Structure

- OpenAI call location:
- schema location:
- validation method:
- retry mechanism:

## Existing Logging / Analytics

- existing event mechanism:
- existing logging:
```

### 완료 조건

Codex가 현재 구조를 이해한 뒤에만 다음 Phase로 진행한다.

현재 구조와 충돌하는 별도 architecture를 임의로 추가하지 않는다.

---

# 4. Phase 1 — AI Structure Benchmark

## 목표

AI 레시피 구조화 기능을 동일한 입력 세트로 반복 실행할 수 있는 benchmark 환경을 만든다.

측정 대상:

```text
Schema validation success rate
Average latency
p50 latency
p95 latency
Failure count
Warning count
```

---

# 5. Benchmark Dataset

다음 위치에 benchmark fixture를 만든다.

```text
benchmarks/
  recipe-structure/
    fixtures/
    results/
```

예:

```text
benchmarks/recipe-structure/fixtures/cases.json
```

최소 20개, 가능하면 30개의 테스트 입력을 구성한다.

## 권장 구성

```text
정형화된 레시피
10개

자연어 형태
5개

단위가 불완전하거나 애매한 레시피
5개

긴 레시피
5개

URL + 직접 입력 혼합 형태
5개
```

현재 서비스가 URL 입력을 실제로 처리하는 방식에 따라 fixture 구조는 조정한다.

---

## Fixture 예시

구현과 현재 타입에 맞게 변경 가능하다.

```json
{
  "id": "manual-001",
  "inputType": "manual",
  "input": {
    "text": "토마토 2개와 계란 3개를..."
  }
}
```

단, Git Repository에 공개될 가능성이 있으므로 실제 사용자 데이터는 사용하지 않는다.

테스트 데이터는 인공적으로 작성한다.

---

# 6. Benchmark Runner

다음과 비슷한 위치에 benchmark script를 만든다.

```text
scripts/benchmark-recipe-structure.ts
```

기존 TypeScript 실행 환경에 맞춰 구현한다.

새로운 runtime dependency는 꼭 필요한 경우에만 추가한다.

---

## 각 실행에서 기록해야 하는 값

```ts
type RecipeStructureBenchmarkResult = {
  caseId: string;
  inputType: string;

  success: boolean;
  schemaValid: boolean;

  latencyMs: number;

  warningCount: number;

  errorType?: string;
};
```

현재 domain type과 맞춰 조정 가능하다.

---

# 7. Latency 측정

OpenAI 요청 직전부터 최종 구조화 결과 validation이 끝날 때까지 측정한다.

가능하면 다음을 포함한다.

```text
OpenAI API call
response parsing
schema validation
```

즉 사용자가 AI 구조화 결과를 받기 위해 기다리는 서버 측 처리 시간을 측정한다.

Node 환경에 맞는 monotonic timer를 사용한다.

예:

```ts
const startedAt = performance.now();

// AI structure

const latencyMs = performance.now() - startedAt;
```

---

# 8. Benchmark Summary

benchmark 실행 후 다음 통계를 계산한다.

```text
total cases
successful cases

schema validation success rate

average latency
p50 latency
p95 latency

total warnings

failure reason count
```

예:

```text
Total: 30
Success: 27

Schema Success Rate: 90.0%

Average Latency: 3241 ms
p50 Latency: 3011 ms
p95 Latency: 5488 ms

Failure:
schema_validation: 2
openai_error: 1
```

---

# 9. Benchmark 결과 파일

각 실행 결과를 파일로 남긴다.

예:

```text
benchmarks/recipe-structure/results/
  baseline-2026-09-12.json
  baseline-2026-09-12-summary.md
```

실제 날짜를 사용한다.

결과 파일에는 raw OpenAI response 전체를 저장하지 않는다.

---

# 10. Percentile 계산

p50 / p95는 benchmark script 안에서 계산한다.

필요하지 않다면 별도의 통계 라이브러리를 추가하지 않는다.

정렬된 latency 배열을 사용해 간단히 계산한다.

계산 방법은 코드와 문서에 명확하게 남긴다.

---

# 11. Benchmark 실행 명령

가능하다면 package.json에 다음과 비슷한 script를 추가한다.

현재 repository convention에 맞게 이름은 변경 가능하다.

```json
{
  "scripts": {
    "benchmark:recipe": "..."
  }
}
```

최종적으로 다음 정도의 명령으로 실행할 수 있어야 한다.

```bash
npm run benchmark:recipe
```

또는 현재 프로젝트 package manager에 맞춘 equivalent command.

---

# 12. Phase 2 — Product Analytics Event 설계

구현 전에 Event Spec을 먼저 작성한다.

다음 파일을 만든다.

```text
docs/analytics/event-spec.md
```

---

# 13. 핵심 Funnel

MVP의 핵심 funnel은 다음으로 정의한다.

```text
recipe_input_started
        ↓
recipe_structure_requested
        ↓
recipe_structure_succeeded
        ↓
recipe_result_edited
        ↓
recipe_saved
```

`recipe_result_edited`는 모든 사용자가 발생시키는 이벤트가 아니므로 funnel 필수 단계로 계산하지 않아도 된다.

분석 관점에서는 다음 Funnel을 기본으로 한다.

```text
recipe_input_started
→ recipe_structure_requested
→ recipe_structure_succeeded
→ recipe_saved
```

---

# 14. 추가 Event

공유 기능이 현재 안정적으로 구현되어 있다면 다음도 추가한다.

```text
recipe_share_created
transfer_invite_created
transfer_invite_opened
transfer_invite_accepted
```

단, 이번 작업의 핵심은 Recipe 저장 Funnel이다.

공유 기능 instrumentation 때문에 일정이 크게 늘어난다면 후순위로 둔다.

---

# 15. Event Naming Convention

Event 이름은 snake_case로 통일한다.

예:

```text
recipe_input_started
recipe_structure_requested
recipe_structure_succeeded
recipe_structure_failed
recipe_result_edited
recipe_saved
recipe_share_created
```

동일 의미의 event를 여러 이름으로 만들지 않는다.

예를 들어 다음과 같은 중복은 금지한다.

```text
recipe_saved
save_recipe
recipe_save_completed
```

---

# 16. Common Event Fields

모든 Event에는 가능한 범위 내에서 다음 공통 필드를 둔다.

```ts
type AnalyticsEvent = {
  eventName: AnalyticsEventName;

  sessionId: string;

  userId?: string;

  timestamp: string;

  properties: Record<
    string,
    string | number | boolean | null
  >;
};
```

실제 구현에서는 Backend에서 userId와 timestamp를 결정하는 것이 더 안전하다면 그렇게 한다.

Client가 신뢰할 수 없는 값을 결정하지 않도록 현재 Auth 구조를 고려해서 설계한다.

---

# 17. 주요 Event Property

## recipe_input_started

```ts
{
  inputType: "url" | "manual" | "url_and_manual"
}
```

---

## recipe_structure_requested

```ts
{
  inputType: "url" | "manual" | "url_and_manual"
}
```

---

## recipe_structure_succeeded

```ts
{
  inputType: "url" | "manual" | "url_and_manual",
  latencyMs: number,
  warningCount: number
}
```

---

## recipe_structure_failed

```ts
{
  inputType: "url" | "manual" | "url_and_manual",
  errorType: string,
  latencyMs?: number
}
```

error message 원문 전체를 analytics에 저장하지 않는다.

Error category만 저장한다.

예:

```text
schema_validation
openai_request
timeout
invalid_input
unknown
```

---

## recipe_result_edited

```ts
{
  inputType: "url" | "manual" | "url_and_manual"
}
```

가능하면 edit 종류를 지나치게 세분화하지 않는다.

첫 버전에서는 수정 여부만 판단해도 충분하다.

동일 사용자 flow에서 여러 번 수정해도 무한히 event를 보내지 않도록 설계한다.

예:

```text
first edit 발생 시 한 번
```

---

## recipe_saved

```ts
{
  inputType: "url" | "manual" | "url_and_manual",
  wasEditedAfterAI: boolean
}
```

---

## recipe_share_created

```ts
{
  shareType: "view" | "transfer"
}
```

---

# 18. Session ID

로그인 사용자라도 flow 단위 분석을 위해 sessionId를 둔다.

기존 session 관리 방식이 있다면 재사용한다.

없다면 최소 구현을 선택한다.

예:

```text
sessionStorage 기반 UUID
```

페이지를 새로고침해도 같은 browser tab session에서 유지되는 수준이면 충분하다.

Analytics 때문에 별도의 복잡한 session infrastructure를 구축하지 않는다.

---

# 19. Phase 3 — Analytics Event Storage

기존 Backend와 DB를 사용해 event를 저장한다.

가능하다면 다음과 비슷한 table을 만든다.

실제 schema convention에 맞춰 수정한다.

```text
analytics_events

id
user_id
session_id
event_name
properties
created_at
```

PostgreSQL이라면 `properties`는 JSONB 사용을 우선 검토한다.

---

## DB Index

최소한 필요한 index만 추가한다.

후보:

```text
event_name
created_at
user_id
session_id
```

현재 데이터 규모가 매우 작다면 필요 이상의 복합 index는 추가하지 않는다.

---

# 20. Analytics API

기존 API convention에 맞춰 event ingest endpoint를 추가한다.

예:

```http
POST /api/analytics/events
```

또는 현재 route naming convention에 맞는 경로.

---

## Request 예

```json
{
  "eventName": "recipe_saved",
  "sessionId": "...",
  "properties": {
    "inputType": "manual",
    "wasEditedAfterAI": true
  }
}
```

---

## Backend에서 결정할 값

가능하면 Backend에서 다음을 결정한다.

```text
userId
createdAt
```

Firebase Authentication 등 현재 인증 정보를 활용한다.

Client에서 전달된 userId를 그대로 신뢰하지 않는다.

---

# 21. Validation

Analytics API request도 validation한다.

허용된 eventName만 수집한다.

정의되지 않은 property가 들어와도 현재 프로젝트 스타일에 따라 reject 또는 ignore 정책을 명확하게 정한다.

추천:

```text
known event → event별 schema validation
unknown event → reject
```

지나치게 복잡한 generic analytics schema engine은 만들지 않는다.

---

# 22. Frontend track 함수

FE에서는 호출 방법을 하나로 통일한다.

예:

```ts
track("recipe_saved", {
  inputType,
  wasEditedAfterAI,
});
```

또는

```ts
analytics.track(...)
```

현재 architecture에 더 자연스러운 방식을 선택한다.

---

# 23. Analytics 때문에 Product Flow가 실패하면 안 된다

매우 중요한 요구사항이다.

Analytics Event 전송 실패가 다음 기능을 막아서는 안 된다.

```text
recipe save
AI structure
navigation
share
```

즉:

```text
Analytics failure != Product failure
```

Event tracking request 실패가 사용자에게 저장 실패로 표시되어서는 안 된다.

필요하다면 non-blocking 호출로 처리한다.

---

# 24. 중복 Event 방지

React re-render나 StrictMode 때문에 동일 event가 불필요하게 여러 번 저장되지 않도록 확인한다.

특히 다음 Event를 주의한다.

```text
recipe_input_started
recipe_result_edited
recipe_saved
```

`useEffect`가 재실행되는 것만으로 event가 여러 번 발생하면 안 된다.

Event는 React rendering이 아니라 **실제 사용자 action / domain transition**에 연결한다.

---

# 25. Phase 4 — Funnel Instrumentation

다음 위치를 실제 코드에서 찾아 event를 심는다.

## 입력 시작

사용자가 레시피 입력을 실제로 시작했을 때:

```text
recipe_input_started
```

단순 페이지 진입만으로 발생시키지 않는다.

---

## AI 요청 직전

```text
recipe_structure_requested
```

---

## AI 성공

Schema validation까지 완료된 후:

```text
recipe_structure_succeeded
```

---

## AI 실패

```text
recipe_structure_failed
```

---

## 결과 수정

사용자가 AI 결과를 최초 수정하는 순간:

```text
recipe_result_edited
```

---

## 최종 저장 성공

DB 저장 성공 응답 이후:

```text
recipe_saved
```

저장 버튼 클릭 시점이 아니다.

반드시 **실제 저장 성공 후** 발생시킨다.

---

# 26. Phase 5 — Analytics 확인용 Query

현재 DB 구조에 맞춰 최소한 다음 분석이 가능해야 한다.

## Event Count

```sql
SELECT
  event_name,
  COUNT(*)
FROM analytics_events
GROUP BY event_name;
```

실제 table naming convention에 맞게 변경한다.

---

## Input Type별 요청 수

```text
manual
url
url_and_manual
```

별 event count를 확인할 수 있어야 한다.

---

## Funnel

최소한 다음 수치를 계산할 수 있는 query 또는 script를 제공한다.

```text
recipe_input_started

recipe_structure_requested

recipe_structure_succeeded

recipe_saved
```

---

# 27. 별도 Analytics Summary Script

가능하면 다음과 같은 script를 만든다.

```text
scripts/analytics-summary.ts
```

실행 시 다음과 같은 결과를 출력한다.

```text
Recipe Funnel

Input Started:       15
Structure Requested: 14
Structure Success:   13
Recipe Saved:        10

Input → Request:     93.3%
Request → Success:   92.9%
Success → Save:      76.9%
```

사용자 수가 매우 적기 때문에 이 숫자를 Product 성과로 해석하지 않는다.

목적은 측정 infrastructure 검증이다.

---

# 28. Phase 6 — Baseline 측정

구현이 끝나면 baseline을 측정한다.

반드시 **개선 작업 전에** 결과를 저장한다.

---

## AI Baseline

최소 20~30 fixture를 실행한다.

다음 값을 기록한다.

```text
schema success rate
average latency
p50 latency
p95 latency
failure count
warning count
```

---

## Product Analytics Baseline

실제 서비스 또는 테스트 환경에서 핵심 흐름을 여러 번 수행한다.

가능하다면 다른 inputType을 모두 포함한다.

```text
manual
url
url_and_manual
```

현재 실제 사용자가 충분하지 않다면 테스트 실행임을 명확히 기록한다.

테스트 실행 데이터를 실제 사용자 Product Metric으로 표현하지 않는다.

---

# 29. Phase 7 — 개선 작업 한 가지 선택

Baseline 결과를 보고 문제 하나만 선택한다.

예:

```text
Schema validation 실패 비율이 높음
```

또는

```text
특정 inputType의 AI response가 매우 느림
```

또는

```text
AI 결과에서 특정 필드 누락이 반복됨
```

---

## 개선 대상 우선순위

다음 기준으로 선정한다.

```text
1. 실제 측정에서 문제가 확인됨
2. 원인을 설명할 수 있음
3. 현재 일정 안에 개선 가능
4. 다시 측정 가능
```

측정 결과와 관계없는 개선을 임의로 선택하지 않는다.

---

# 30. 가능한 개선 예시

AI 구조화에서:

```text
prompt 수정
schema 수정
preprocessing 개선
error handling 개선
retry 정책 개선
```

등이 가능하다.

단, baseline 결과를 본 후 결정한다.

---

# 31. Phase 8 — Before / After 측정

개선 후 **동일한 fixture**를 다시 실행한다.

Dataset을 변경하지 않는다.

그렇지 않으면 비교가 무의미해진다.

---

## 결과 예

실제 측정값만 기록한다.

```text
Before

Schema Success
24 / 30
80.0%

Average Latency
3.6s

p95
6.1s


After

Schema Success
29 / 30
96.7%

Average Latency
3.5s

p95
5.9s
```

성공률만 개선되고 latency가 그대로여도 괜찮다.

Latency가 나빠졌다면 그것 역시 그대로 기록한다.

---

# 32. Trade-off 기록

결과가 다음처럼 나올 수도 있다.

```text
Schema success
84% → 97%

p95 latency
4.8s → 5.4s
```

이런 경우 실패가 아니다.

오히려 중요한 engineering trade-off가 된다.

왜 latency가 늘었는지 분석하고 문서화한다.

---

# 33. Phase 9 — 최종 결과 문서

다음 파일을 생성한다.

```text
docs/metrics/measurement-report.md
```

다음 구조를 따른다.

```md
# Recipebook Measurement Report

## 1. Why

기존에는 기능이 동작하는지만 확인했고,
AI 구조화 품질과 사용자 흐름을 객관적으로 확인할 수 없었다.

## 2. What We Measure

### AI

- Schema validation success rate
- Average latency
- p50
- p95

### Product

- recipe_input_started
- recipe_structure_requested
- recipe_structure_succeeded
- recipe_saved

## 3. Baseline

실제 값

## 4. Problem Found

측정을 통해 발견한 문제

## 5. Change

어떤 변경을 했으며 왜 선택했는지

## 6. After

동일 Dataset에서 재측정한 실제 값

## 7. Result

Before / After 비교

## 8. Trade-offs

개선되지 않은 부분
악화된 부분
측정 한계

## 9. Next Step

추후 실제 사용자 데이터가 쌓이면 확인할 항목
```

---

# 34. Product Analytics 문서

다음 문서도 유지한다.

```text
docs/analytics/event-spec.md
```

각 Event마다 다음을 기록한다.

```text
Event name
Trigger
Properties
Reason
Example question
```

예:

```md
## recipe_structure_succeeded

### Trigger

AI response가 Recipe Schema validation까지 성공한 직후

### Properties

- inputType
- latencyMs
- warningCount

### Why

AI 구조화 기능의 성공 여부와 latency를
Product flow와 연결하기 위해 측정한다.

### Questions

- inputType에 따라 latency 차이가 있는가?
- warningCount가 많은 결과는 사용자가 더 자주 수정하는가?
```

---

# 35. 테스트

다음 항목을 가능한 범위에서 테스트한다.

## Analytics

* valid event 저장
* unknown event reject
* authentication handling
* properties validation
* analytics failure가 product flow를 막지 않음

## Benchmark

* summary 계산
* percentile 계산
* failed request 기록
* schema validation 실패 기록

---

# 36. 코드 품질 원칙

이번 작업에서 특히 다음을 지킨다.

### YAGNI

현재 필요한 Event만 만든다.

### KISS

Analytics를 범용 플랫폼으로 만들지 않는다.

### Explicit

Event 발생 시점은 코드에서 명확히 드러나야 한다.

### Measurable

모든 최적화는 가능하면 before / after가 있어야 한다.

---

# 37. 하지 말아야 할 것

이번 작업에서는 다음을 하지 않는다.

```text
Amplitude 도입
Mixpanel 도입
GA 전체 도입
Kafka 구축
Data Warehouse 구축
Dashboard 시스템 개발
별도 Analytics Microservice
대규모 Event abstraction
A/B Test framework 직접 구축
```

이후 필요가 생기면 별도 작업으로 다룬다.

---

# 38. Git 작업 단위 권장

가능하면 다음처럼 작은 commit으로 분리한다.

```text
docs: define recipe analytics events

feat: add analytics event storage

feat: instrument recipe creation funnel

feat: add recipe structure benchmark

docs: record benchmark baseline

fix/refactor: improve recipe structure based on benchmark

docs: record before-after measurement
```

현재 Repository convention이 있다면 기존 convention을 따른다.

---

# 39. Codex 실행 방식

Codex는 한 번에 전체 코드를 변경하지 않는다.

다음 순서로 진행한다.

```text
1.
Repository를 분석하고
Phase 0 문서를 작성한다.

2.
현재 architecture를 기반으로
구현 계획을 짧게 정리한다.

3.
Benchmark부터 구현한다.

4.
Benchmark가 실제로 실행되는지 검증한다.

5.
Event Spec을 작성한다.

6.
Analytics storage/API를 구현한다.

7.
Frontend instrumentation을 구현한다.

8.
테스트한다.

9.
Baseline을 실제 실행한다.

10.
측정 결과를 보고 개선 후보를 제안한다.

11.
가장 작은 개선 하나를 적용한다.

12.
동일 fixture로 재측정한다.

13.
measurement-report.md를 작성한다.
```

---

# 40. Codex에게 요구하는 보고 형식

각 Phase 종료 시 다음 형식으로 보고한다.

```md
## Completed

변경한 내용

## Files

변경/추가된 파일

## Verification

실행한 테스트 또는 명령

## Result

실제 결과

## Remaining

다음 Phase 작업

## Risks / Questions

발견한 문제
```

---

# 41. 중요한 Codex 규칙

### 기존 코드를 먼저 읽는다

파일 이름이나 architecture를 추측해서 만들지 않는다.

### 기존 convention을 따른다

현재 프로젝트에 존재하는:

```text
folder structure
error handling
type definition
API response
DB naming
testing convention
```

을 우선한다.

### 의존성 추가를 최소화한다

새 dependency가 필요하면 추가 이유를 설명한다.

### 사용자 기능을 깨뜨리지 않는다

Analytics 때문에 Recipe 저장이나 AI 구조화가 실패하면 안 된다.

### 측정 결과를 조작하지 않는다

실제 benchmark output만 기록한다.

### 작업 범위를 임의로 확장하지 않는다

이 문서에 없는 unrelated refactoring을 수행하지 않는다.

---

# 42. Definition of Done

다음이 모두 만족되면 작업 완료다.

## AI Measurement

* [ ] 고정된 benchmark fixture 20개 이상
* [ ] benchmark 자동 실행 가능
* [ ] Schema validation 성공률 계산
* [ ] Average latency 계산
* [ ] p50 계산
* [ ] p95 계산
* [ ] Failure category 기록
* [ ] Baseline 결과 파일 존재

## Product Analytics

* [ ] Event Spec 문서 존재
* [ ] 핵심 Funnel 정의
* [ ] Analytics Event 저장 가능
* [ ] recipe_input_started 수집
* [ ] recipe_structure_requested 수집
* [ ] recipe_structure_succeeded 수집
* [ ] recipe_structure_failed 수집
* [ ] recipe_result_edited 수집
* [ ] recipe_saved 수집
* [ ] Event count 확인 가능
* [ ] Funnel count 확인 가능

## Measurement

* [ ] Baseline 측정 완료
* [ ] 문제 하나 선택
* [ ] 개선 하나 적용
* [ ] 동일 Dataset 재측정
* [ ] Before / After 비교
* [ ] Trade-off 기록

## Documentation

* [ ] current-architecture.md
* [ ] event-spec.md
* [ ] baseline result
* [ ] measurement-report.md

---

# 43. 최종적으로 얻고 싶은 경험

이 작업의 최종 목적은 이력서를 위한 숫자 생성 자체가 아니다.

기존 개발 방식이

```text
기능 구현
→ 동작 확인
→ 완료
```

였다면 이를

```text
문제 정의
→ 구현
→ 측정
→ 문제 발견
→ 개선
→ 재측정
```

으로 바꾸는 것이 목적이다.

최종 결과가 좋지 않아도 실제 측정값은 그대로 유지한다.

좋은 결과보다

**어떤 기준을 정의했고, 무엇을 측정했고, 결과를 보고 어떤 판단을 했는지**

가 더 중요하다.

---

# 44. 이후 이력서에 활용 가능한 형태

실제 결과가 나온 뒤에만 다음 형식으로 작성한다.

```text
AI 레시피 구조화 품질을 정성적으로 판단하던 방식을 개선하기 위해
XX개의 고정 테스트 케이스로 benchmark를 구축했습니다.

Schema validation 성공률과 평균/p95 응답시간을 측정해
[실제 문제]를 발견했고,
[실제 변경]을 적용해
성공률을 XX% → XX%로 개선했습니다.
```

Product Analytics는:

```text
기능 동작 여부만 확인하던 기존 방식에서 벗어나
레시피 입력 → AI 구조화 → 저장 과정을 핵심 Funnel로 정의하고
행동 Event를 수집할 수 있는 구조를 구현했습니다.

이를 통해 입력 방식과 AI 처리 결과를
사용자의 실제 저장 행동과 연결해 분석할 수 있는 기반을 만들었습니다.
```

사용자 수가 적을 경우:

```text
저장 전환율 XX%를 달성했다
```

와 같은 표현은 사용하지 않는다.

대신

```text
측정 가능한 구조를 만들었다
```

는 사실과 실제 Engineering Metric을 중심으로 설명한다.
