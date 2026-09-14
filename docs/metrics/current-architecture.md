# Current Architecture

## Frontend

- framework: React 19와 Vite, JavaScript JSX
- state management: React 컴포넌트의 로컬 상태와 Context 기반 인증 상태. 별도 서버 상태 또는 전역 상태 라이브러리는 없다.
- API client: `frontend/src/api/apiClient.js`의 `apiRequest`가 환경 변수 기반 API origin, Firebase ID 토큰, JSON 응답과 공통 오류를 처리한다.
- routing: `react-router`의 중첩 라우트와 보호 라우트
- recipe input flow: `RecipeNewPage`가 `RecipeInputForm` 입력을 받아 `recipeApi.structureRecipe`를 호출하고, 응답 초안을 `/recipes/new/draft`의 route state로 전달한다.
- recipe edit/save flow: `RecipeDraftPage`가 `RecipeDraftForm`의 수정된 초안을 `recipeApi.createRecipe`로 저장하고 성공 후 상세 화면으로 이동한다.

## Backend

- framework: Express 5와 TypeScript
- route pattern: Route가 HTTP 입력 검증과 응답을 담당하고, 복잡한 레시피 규칙과 데이터 처리는 Service로 위임한다.
- recipe structure endpoint: `POST /api/ai/recipes/structure` (`backend/src/routes/ai.routes.ts`)
- recipe save endpoint: `POST /api/recipes` (`backend/src/routes/recipes.routes.ts`)
- authentication: 보호 라우트 앞의 `requireFirebaseAuth` middleware가 Firebase ID 토큰을 검증하고 `req.firebaseUser`를 설정한다.
- error format: `{ "error": { "code": string, "message": string } }`

## Database

- database: PostgreSQL
- ORM / query layer: ORM 없이 `pg` Pool과 파라미터 쿼리를 사용한다.
- migrations: `backend/migrations`의 번호순 SQL을 `schema_migrations` 테이블로 추적해 트랜잭션 안에서 한 번씩 적용한다.
- existing event-like storage: `recipe_audit_events`는 삭제·복원 감사 기록 전용이며 Product Analytics 용도가 아니다.

## AI Structure

- OpenAI call location: `backend/src/services/recipeStructure.service.ts`의 `structureRecipe`
- provider API: OpenAI Responses API
- model configuration: `OPENAI_MODEL`, 기본값 `gpt-5.6-luna`
- reasoning configuration: warning 참조 무결성 개선 후 benchmark guardrail을 통과한 `none`을 명시한다.
- schema location: `backend/src/services/recipeStructureContract.ts`의 `RECIPE_STRUCTURE_SCHEMA`
- validation method: 재료·조리 단계 warning을 해당 항목에 귀속해 받은 뒤 Backend가 공개 편집 경로로 변환하고, JSON 파싱과 도메인 검증을 다시 수행한다.
- measured server boundary: `structureRecipe` 호출 직전부터 응답 파싱과 도메인 검증 완료까지가 AI benchmark latency 범위다.
- timeout: 15초 AbortController timeout
- retry mechanism: 자동 재시도 없음
- URL handling: 일반 URL과 YouTube 수집은 Route에서 먼저 수행하고, 정제한 텍스트와 검증된 출처만 `structureRecipe`에 전달한다.

## Existing Logging / Analytics

- existing event mechanism: 없음
- existing analytics storage/API: 없음
- existing logging: 서버 시작, 마이그레이션, 외부 제공자 오류·검증 실패를 `console`로 기록한다. AI 요청 원문과 응답 전문은 기록하지 않는다.

## Test Environment

- backend: Node 내장 test runner를 `tsx --test`로 실행하며 Service 단위 테스트가 중심이다.
- frontend: Vitest, jsdom, Testing Library
- available verification: Backend `test`, `type-check`, `build`; Frontend `test`, `lint`, `build`

## Analytics Alignment

- 기존 PostgreSQL, Express 인증 middleware, 공통 API 응답 형식과 Frontend `apiRequest`를 재사용한다.
- 핵심 저장 Funnel만 수집하고 공유 Event는 이번 범위에서 제외한다.
- 원문, 전체 URL, 토큰, 사용자 프로필과 AI 요청·응답 전문은 Event에 저장하지 않는다.
- Analytics 전송 실패는 AI 구조화, 레시피 저장 또는 화면 이동의 성공 여부를 바꾸지 않는다.
