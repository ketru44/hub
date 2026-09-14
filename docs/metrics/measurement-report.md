# Recipebook Measurement Report

## 1. Why

기존에는 핵심 레시피 흐름과 AI 구조화 기능이 동작하는지만 확인했고, Schema 성공률·응답시간과 저장 Funnel을 같은 기준으로 반복 측정할 수 없었다. 이번 작업은 새 Analytics 제품을 만드는 대신 기존 Backend와 PostgreSQL 위에 최소 측정 기반을 추가한다.

검증 흐름: **20 fixture baseline → regression → root cause → contract redesign → final metrics → limitations**

## 2. What We Measure

### AI

- Schema validation success rate
- Average latency
- p50 latency
- p95 latency
- Failure category
- Warning count

AI latency는 기존 `structureRecipe`의 OpenAI 요청 직전부터 응답 JSON 파싱과 Backend 도메인 검증이 끝날 때까지 모든 시도를 포함한다.

### Product

- `recipe_input_started`
- `recipe_structure_requested`
- `recipe_structure_succeeded`
- `recipe_structure_failed`
- `recipe_result_edited`
- `recipe_saved`

기본 Funnel은 입력 시작 → 구조화 요청 → 구조화 성공 → 저장이며 초안 수정은 선택 단계다.

## 3. Baseline — 20 Fixtures

실행 시각: 2026-09-14 17:18 KST  
Dataset: 고정 인공 fixture 20개  
Model: `gpt-5.6-luna`  
Reasoning effort: API 기본값 `medium`  
실행 방식: 순차 요청, 자동 재시도 없음

| Metric | Baseline |
| --- | ---: |
| Total | 20 |
| Schema valid | 20 |
| Schema success rate | 100.0% |
| Average latency | 5,895ms |
| p50 latency | 5,126ms |
| p95 latency | 9,508ms |
| Total warnings | 30 |
| Failures | 0 |

상세 결과: `benchmarks/recipe-structure/results/baseline-2026-09-14T08-18-51.288Z.json`

Product Analytics baseline: **Not measured yet**. 설정된 PostgreSQL 연결이 `tenant/user ... not found`로 실패해 migration 적용과 테스트 flow Event 저장을 수행하지 못했다.

## 4. Latency Opportunity

20개 모두 Schema를 통과했으므로 품질 실패를 근거로 prompt나 schema를 바꿀 이유는 없었다. 측정된 개선 후보는 p95 9,508ms와 최장 11,186ms의 AI 구조화 latency였다.

## 5. Regression Experiment

Model, prompt, schema, fixture와 실행 순서를 유지하고 Responses API의 `reasoning.effort`만 기본 `medium`에서 `none`으로 바꾸는 한 가지 실험을 수행했다. `gpt-5.6-luna`가 이 값을 공식 지원하며, 구조화 추출에서 불필요한 reasoning 시간을 줄일 수 있는지 확인하기 위한 변경이었다.

## 6. Regression

실행 시각: 2026-09-14 17:44 KST  
Dataset: Baseline과 동일한 고정 인공 fixture 20개  
Model: `gpt-5.6-luna`  
Reasoning effort: `none`

| Metric | After |
| --- | ---: |
| Total | 20 |
| Schema valid | 19 |
| Schema success rate | 95.0% |
| Average latency | 4,071ms |
| p50 latency | 3,617ms |
| p95 latency | 5,611ms |
| Total warnings | 41 |
| Failures | 1 (`schema_validation`) |

`mixed-002` case가 허용되지 않은 warning field를 반환해 Backend 검증에서 전체 거부됐다.

상세 결과: `benchmarks/recipe-structure/results/after-2026-09-14T08-44-16.577Z.json`

## 7. Root Cause

최상위 `warnings[].field`가 배열 인덱스를 문자열로 직접 생성하는 구조를 점검했다. JSON Schema는 경로 문법을 제한할 수 있지만 해당 인덱스가 같은 응답의 `ingredients` 또는 `steps` 범위 안인지 교차 검증할 수 없다.

먼저 허용 경로를 정규식으로 제한해 재실행했으나 `natural-003`에서 다시 `warning_field`가 발생해 19/20에 머물렀다. 문법 오류가 아니라 동적 참조 무결성 문제임을 확인했다.

중간 검증 결과: `benchmarks/recipe-structure/results/contract-fix-2026-09-14T09-29-26.908Z.json`

## 8. Contract Redesign

수정 후에는 재료와 조리 단계의 warning을 각각의 배열 항목 안에 생성하도록 제공자 스키마를 변경했다. Backend가 검증된 배열 위치를 사용해 `ingredients[n].field`와 `steps[n].description` 공개 경로로 변환한다. 잘못된 AI 응답을 보정하는 대신 모델이 인덱스를 직접 생성할 필요를 제거했으며, API 성공 응답 형식은 유지했다.

## 9. Final Metrics

실행 시각: 2026-09-14 18:36 KST  
Dataset: Baseline과 동일한 고정 인공 fixture 20개  
Model: `gpt-5.6-luna`  
Reasoning effort: `none`

| Metric | Fixed |
| --- | ---: |
| Total | 20 |
| Schema valid | 20 |
| Schema success rate | 100.0% |
| Average latency | 3,555ms |
| p50 latency | 3,271ms |
| p95 latency | 5,735ms |
| Total warnings | 42 |
| Failures | 0 |

상세 결과: `benchmarks/recipe-structure/results/warning-locality-fix-2026-09-14T09-36-43.844Z.json`

### Baseline Comparison

| Metric | Medium baseline | Initial `none` | Fixed `none` | Baseline 대비 |
| --- | ---: | ---: | ---: | ---: |
| Schema success rate | 100.0% | 95.0% | 100.0% | 0.0%p |
| Average latency | 5,895ms | 4,071ms | 3,555ms | -2,340ms (-39.7%) |
| p50 latency | 5,126ms | 3,617ms | 3,271ms | -1,855ms (-36.2%) |
| p95 latency | 9,508ms | 5,611ms | 5,735ms | -3,773ms (-39.7%) |
| Total warnings | 30 | 41 | 42 | +12 |

Schema 성공률 100% guardrail을 회복하면서 latency가 감소했으므로 운영 코드는 `reasoning.effort: "none"`을 채택한다.

## 10. Limitations

- 각 단계는 한 번 실행한 20개 표본이므로 제공자 부하와 모델 변동성을 분리한 통계적 결론은 아니다.
- Warning 수 증가는 더 신중한 표시일 수도 있어 그 자체를 품질 저하로 단정하지 않는다. 채택 판단의 guardrail은 Schema validation 성공률이다.
- URL fixture는 URL 수집 네트워크가 아니라 수집 후 OpenAI 구조화 구간을 고정 측정한다.
- Product Analytics migration과 실제 Event 저장은 DB 연결 설정 문제로 검증하지 못했다.
- 동일 tab에서 여러 레시피 flow를 수행하면 ordered-session Funnel은 첫 Event 기준으로 한 session만 센다. 초기 측정 기반 검증에는 충분하지만 반복 flow 분석이 필요해지면 별도 flow identifier를 검토한다.

## 11. Next Step

1. 올바른 PostgreSQL 연결 설정으로 `npm run migrate`를 두 번 실행하고 catalog에서 `analytics_events`의 컬럼·FK·CHECK·인덱스를 확인한다.
2. `manual`, `url`, `url_and_manual` 테스트 flow를 수행한 뒤 `npm run analytics:summary`로 Event와 Funnel을 확인한다.
3. 실제 사용자 데이터가 쌓이기 전까지 테스트 Event를 Product 성과로 표현하지 않는다.
4. 모델 변경이나 prompt 수정 시 같은 fixture를 반복 실행하고 Schema 성공률을 우선 guardrail로 유지한다.
