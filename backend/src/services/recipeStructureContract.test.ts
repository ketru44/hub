import assert from "node:assert/strict";
import test from "node:test";

import {
  getStructureRecipeValidationFailure,
  parseProviderStructureRecipeResult,
  RECIPE_STRUCTURE_SCHEMA,
  type StructureRecipeResult,
} from "./recipeStructureContract.js";

const validResult: StructureRecipeResult = {
  draft: {
    title: "김치찌개",
    description: null,
    servings: null,
    cookingTimeMinutes: null,
    source: null,
    ingredients: [
      {
        name: "김치",
        amount: "200",
        unit: "g",
        order: 1,
      },
    ],
    steps: [
      {
        order: 1,
        description: "재료를 넣고 끓인다.",
      },
    ],
  },
  warnings: [],
};

test("Structured Output schema가 warning을 대상 항목에 귀속한다", () => {
  const draftProperties = RECIPE_STRUCTURE_SCHEMA.properties.draft.properties;

  assert.deepEqual(
    RECIPE_STRUCTURE_SCHEMA.properties.warnings.items.properties.field.enum,
    ["title", "description", "servings", "cookingTimeMinutes"],
  );
  assert.deepEqual(
    draftProperties.ingredients.items.properties.warnings.items.properties.field
      .enum,
    ["name", "amount", "unit"],
  );
  assert.deepEqual(
    draftProperties.steps.items.properties.warnings.items.properties.field.enum,
    ["description"],
  );
});

test("항목에 귀속된 warning을 공개 응답의 편집 경로로 변환한다", () => {
  const parsed = parseProviderStructureRecipeResult({
    draft: {
      ...validResult.draft,
      ingredients: [
        {
          ...validResult.draft.ingredients[0],
          warnings: [
            {
              field: "amount",
              message: "양을 추정했습니다.",
              suggestedValue: "200",
            },
          ],
        },
      ],
      steps: [
        {
          ...validResult.draft.steps[0],
          warnings: [
            {
              field: "description",
              message: "시간을 확인해 주세요.",
              suggestedValue: null,
            },
          ],
        },
      ],
    },
    warnings: [
      {
        field: "servings",
        message: "인분을 확인해 주세요.",
        suggestedValue: null,
      },
    ],
  });

  assert.equal(parsed.failure, null);
  assert.deepEqual(parsed.result, {
    ...validResult,
    warnings: [
      {
        field: "servings",
        message: "인분을 확인해 주세요.",
        suggestedValue: null,
      },
      {
        field: "ingredients[0].amount",
        message: "양을 추정했습니다.",
        suggestedValue: "200",
      },
      {
        field: "steps[0].description",
        message: "시간을 확인해 주세요.",
        suggestedValue: null,
      },
    ],
  });
});

test("대상 항목에서 허용하지 않는 warning field를 거부한다", () => {
  const parsed = parseProviderStructureRecipeResult({
    draft: {
      ...validResult.draft,
      ingredients: [
        {
          ...validResult.draft.ingredients[0],
          warnings: [
            {
              field: "description",
              message: "잘못된 필드입니다.",
              suggestedValue: null,
            },
          ],
        },
      ],
      steps: validResult.draft.steps.map((step) => ({
        ...step,
        warnings: [],
      })),
    },
    warnings: [],
  });

  assert.equal(parsed.result, null);
  assert.equal(parsed.failure, "schema_mismatch");
});

test("Backend가 공개 warning field의 실제 배열 범위를 다시 검증한다", () => {
  for (const field of [
    "title",
    "ingredients[0].amount",
    "steps[0].description",
  ]) {
    assert.equal(
      getStructureRecipeValidationFailure({
        ...validResult,
        warnings: [{ field, message: "확인이 필요합니다.", suggestedValue: null }],
      }),
      null,
      field,
    );
  }

  for (const field of [
    "draft.title",
    "ingredients[0].description",
    "ingredients[1].amount",
    "steps[1].description",
  ]) {
    assert.equal(
      getStructureRecipeValidationFailure({
        ...validResult,
        warnings: [{ field, message: "확인이 필요합니다.", suggestedValue: null }],
      }),
      "warning_field",
      field,
    );
  }
});
