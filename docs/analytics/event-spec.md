# Recipebook Product Analytics Event Spec

## Scope

MVP의 레시피 입력 → AI 구조화 → 초안 수정 → 저장 흐름만 측정한다. 공유 Event는 핵심 Funnel 안정화 이후로 미룬다.

Analytics 실패는 AI 구조화, 레시피 저장, 화면 이동을 실패시키지 않는다. 원문, 메모, 전체 URL, 토큰, 이메일, 이름, OpenAI prompt와 response 전문은 수집하지 않는다.

## Common Contract

Client request:

```ts
interface AnalyticsEventRequest {
  eventName: AnalyticsEventName;
  sessionId: string;
  properties: Record<string, string | number | boolean | null>;
}
```

Server stored event:

```ts
interface AnalyticsEvent extends AnalyticsEventRequest {
  userId: string;
  timestamp: string;
}
```

- `eventName`: 이 문서에 정의한 snake_case 이름만 허용한다.
- `sessionId`: browser tab 단위 `sessionStorage` UUID다.
- `userId`: Firebase 인증 정보와 연결된 내부 User ID를 Backend가 결정한다.
- `timestamp`: Event 수신 시각을 Backend가 결정한다.
- `properties`: Event별 허용 필드와 타입을 엄격히 검증하며 알 수 없는 필드는 거부한다.

## Core Funnel

```text
recipe_input_started
→ recipe_structure_requested
→ recipe_structure_succeeded
→ recipe_saved
```

`recipe_result_edited`는 선택 단계이므로 기본 Funnel 전환율의 필수 단계로 계산하지 않는다. 구조화 실패는 `recipe_structure_failed`로 별도 집계한다.

## Input Type

```ts
type InputType = "manual" | "url" | "url_and_manual";
```

Event가 발생하는 시점의 정규화된 URL·직접 입력 존재 여부로 결정한다.

## Events

### recipe_input_started

#### Trigger

사용자가 빈 입력 폼의 URL 또는 직접 입력 필드에 처음으로 내용을 입력한 순간 한 번 발생한다. 페이지 진입이나 React render로 발생시키지 않는다.

#### Properties

- `inputType`: `InputType`

#### Why

입력 화면 진입이 아니라 실제 작성 시작 수를 측정한다.

#### Questions

- 입력을 시작한 flow 중 AI 구조화를 요청한 비율은 얼마인가?
- 사용자가 처음 시작하는 입력 방식은 무엇인가?

### recipe_structure_requested

#### Trigger

검증된 입력으로 AI 구조화 API를 호출하기 직전에 제출 action당 한 번 발생한다.

#### Properties

- `inputType`: `InputType`

#### Why

입력 시작 후 실제 AI 요청까지 도달한 flow를 측정한다.

#### Questions

- input type별 구조화 요청 수는 얼마인가?
- 입력 시작 후 요청 전 이탈은 얼마나 되는가?

### recipe_structure_succeeded

#### Trigger

AI 구조화 API가 Schema와 Backend 도메인 검증을 통과한 성공 응답을 반환한 직후 발생한다.

#### Properties

- `inputType`: `InputType`
- `latencyMs`: 요청 직전부터 성공 응답 수신까지의 client-observed monotonic elapsed time
- `warningCount`: 응답의 warning 수

#### Why

구조화 성공과 사용자가 실제로 기다린 시간을 저장 행동에 연결한다. 순수 OpenAI·검증 latency는 별도 benchmark가 측정한다.

#### Questions

- input type에 따라 성공 latency가 다른가?
- warning이 많은 결과는 더 자주 수정되는가?

### recipe_structure_failed

#### Trigger

AI 구조화 API 호출이 실패한 직후 발생한다.

#### Properties

- `inputType`: `InputType`
- `errorType`: `invalid_input | url_fetch | rate_limited | schema_validation | openai_request | timeout | network | unknown`
- `latencyMs`: 요청 직전부터 실패 확인까지의 client-observed monotonic elapsed time

#### Why

사용자 콘텐츠나 원문 오류 메시지 없이 실패 지점을 범주로 확인한다.

#### Questions

- 구조화 실패의 주된 범주는 무엇인가?
- input type별 실패 비율과 대기 시간은 어떤가?

### recipe_result_edited

#### Trigger

AI 초안의 제목, 설명, 인원, 시간, 재료, 단계 또는 출처를 사용자가 처음 변경한 순간 flow당 한 번 발생한다. 이후 수정과 React render는 추가 Event를 만들지 않는다.

#### Properties

- `inputType`: `InputType`

#### Why

AI 초안이 저장 전에 사람의 수정을 필요로 한 flow를 측정한다.

#### Questions

- AI 성공 flow 중 사용자가 초안을 수정한 비율은 얼마인가?
- input type별 수정 여부가 다른가?

### recipe_saved

#### Trigger

`POST /api/recipes`가 실제 DB 저장 성공 응답을 반환한 직후 발생한다. 저장 버튼 클릭만으로 발생시키지 않는다.

#### Properties

- `inputType`: `InputType`
- `wasEditedAfterAI`: 현재 flow에서 `recipe_result_edited`가 발생했는지 여부

#### Why

AI 구조화 성공이 실제 레시피 저장으로 이어졌는지 측정한다.

#### Questions

- 구조화 성공 후 저장 전환은 얼마인가?
- 수정 여부와 input type에 따라 저장 흐름이 다른가?

## Failure Category Mapping

| API error code / condition | `errorType` |
| --- | --- |
| `VALIDATION_ERROR`, `INVALID_URL`, `URL_NOT_ALLOWED` | `invalid_input` |
| `URL_FETCH_FAILED` | `url_fetch` |
| `AI_RATE_LIMITED` | `rate_limited` |
| `AI_RESPONSE_INVALID` | `schema_validation` |
| `AI_REQUEST_FAILED` | `openai_request` |
| request AbortError | `timeout` |
| `NETWORK_ERROR` | `network` |
| anything else | `unknown` |

원문 오류 message는 Event property에 넣지 않는다.

## Ingest Policy

- Endpoint: `POST /api/analytics/events`
- Authentication: Firebase ID token 필수
- 성공: `201`과 `{ "data": { "id": string } }`
- 알 수 없는 Event, 누락·추가 property, 잘못된 타입과 UUID가 아닌 session ID: `400 ANALYTICS_EVENT_INVALID`
- Client가 보낸 `userId`, `timestamp`와 정의되지 않은 최상위 필드는 거부한다.
- 전송은 Product action과 await chain을 공유하지 않는 best-effort 방식으로 수행한다.

## Funnel Query Semantics

- Event count는 Event row 수를 센다.
- Funnel은 동일 `session_id` 안에서 각 Event의 최초 `created_at`을 사용하고 정의한 순서대로 발생한 flow만 다음 단계 도달로 센다.
- 개발·테스트 실행은 실제 사용자 Product Metric과 구분해 해석한다.
