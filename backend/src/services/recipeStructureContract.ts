export interface Ingredient {
  name: string;
  amount: string | null;
  unit: string | null;
  order: number;
}

export interface RecipeStep {
  order: number;
  description: string;
}

export interface RecipeSource {
  url: string;
  title: string | null;
  author: string | null;
}

export interface RecipeDraft {
  title: string;
  description: string | null;
  servings: string | null;
  cookingTimeMinutes: number | null;
  source: RecipeSource | null;
  ingredients: Ingredient[];
  steps: RecipeStep[];
}

export interface RecipeWarning {
  field: string;
  message: string;
  suggestedValue: string | number | null;
}

export interface StructureRecipeResult {
  draft: RecipeDraft;
  warnings: RecipeWarning[];
}

export type StructureRecipeValidationFailure =
  | "ingredient_order"
  | "step_order"
  | "warning_field"
  | "blank_value"
  | "schema_mismatch";

const RECIPE_WARNING_FIELDS = [
  "title",
  "description",
  "servings",
  "cookingTimeMinutes",
] as const;
const INGREDIENT_WARNING_FIELDS = ["name", "amount", "unit"] as const;
const STEP_WARNING_FIELDS = ["description"] as const;

function createWarningSchema(fieldValues: readonly string[]) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      field: {
        type: "string",
        enum: fieldValues,
      },
      message: {
        type: "string",
        minLength: 1,
      },
      suggestedValue: {
        anyOf: [
          { type: "string" },
          { type: "number" },
          { type: "null" },
        ],
      },
    },
    required: ["field", "message", "suggestedValue"],
  } as const;
}

export const RECIPE_STRUCTURE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    draft: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: {
          type: "string",
          minLength: 1,
        },
        description: {
          anyOf: [{ type: "string" }, { type: "null" }],
        },
        servings: {
          anyOf: [{ type: "string" }, { type: "null" }],
        },
        cookingTimeMinutes: {
          anyOf: [
            {
              type: "integer",
              minimum: 0,
            },
            { type: "null" },
          ],
        },
        ingredients: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: {
                type: "string",
                minLength: 1,
              },
              amount: {
                anyOf: [{ type: "string" }, { type: "null" }],
              },
              unit: {
                anyOf: [{ type: "string" }, { type: "null" }],
              },
              order: {
                type: "integer",
                minimum: 1,
              },
              warnings: {
                type: "array",
                items: createWarningSchema(INGREDIENT_WARNING_FIELDS),
              },
            },
            required: ["name", "amount", "unit", "order", "warnings"],
          },
        },
        steps: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              order: {
                type: "integer",
                minimum: 1,
              },
              description: {
                type: "string",
                minLength: 1,
              },
              warnings: {
                type: "array",
                items: createWarningSchema(STEP_WARNING_FIELDS),
              },
            },
            required: ["order", "description", "warnings"],
          },
        },
        source: {
          type: "null",
        },
      },
      required: [
        "title",
        "description",
        "servings",
        "cookingTimeMinutes",
        "ingredients",
        "steps",
        "source",
      ],
    },
    warnings: {
      type: "array",
      items: createWarningSchema(RECIPE_WARNING_FIELDS),
    },
  },
  required: ["draft", "warnings"],
} as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNullableString(value: unknown) {
  return typeof value === "string" || value === null;
}
function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: string[],
) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}
function hasSequentialOrders(items: Array<{ order: number }>) {
  const orders = new Set(items.map(({ order }) => order));

  return (
    orders.size === items.length &&
    items.every(
      ({ order }) =>
        Number.isInteger(order) && order >= 1 && order <= items.length,
    )
  );
}

function isEditableWarningField(
  field: string,
  ingredientCount: number,
  stepCount: number,
): boolean {
  if (RECIPE_WARNING_FIELDS.some((recipeField) => recipeField === field)) {
    return true;
  }

  const ingredientMatch =
    /^ingredients\[(0|[1-9]\d*)\]\.(name|amount|unit)$/.exec(field);

  if (ingredientMatch) {
    return Number(ingredientMatch[1]) < ingredientCount;
  }

  const stepMatch = /^steps\[(0|[1-9]\d*)\]\.description$/.exec(field);

  if (stepMatch) {
    return Number(stepMatch[1]) < stepCount;
  }

  return false;
}

function isIngredient(value: unknown): value is Ingredient {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["name", "amount", "unit", "order"])
  ) {
    return false;
  }

  return (
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    isNullableString(value.amount) &&
    isNullableString(value.unit) &&
    typeof value.order === "number" &&
    Number.isInteger(value.order) &&
    value.order >= 1
  );
}

function isRecipeStep(value: unknown): value is RecipeStep {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["order", "description"])
  ) {
    return false;
  }

  return (
    typeof value.order === "number" &&
    Number.isInteger(value.order) &&
    value.order >= 1 &&
    typeof value.description === "string" &&
    value.description.trim().length > 0
  );
}

function isRecipeWarning(
  value: unknown,
  ingredientCount: number,
  stepCount: number,
): value is RecipeWarning {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["field", "message", "suggestedValue"])
  ) {
    return false;
  }

  const isValidSuggestedValue =
    value.suggestedValue === null ||
    typeof value.suggestedValue === "string" ||
    (typeof value.suggestedValue === "number" &&
      Number.isFinite(value.suggestedValue));

  return (
    typeof value.field === "string" &&
    value.field.trim().length > 0 &&
    isEditableWarningField(value.field, ingredientCount, stepCount) &&
    typeof value.message === "string" &&
    value.message.trim().length > 0 &&
    isValidSuggestedValue
  );
}

function isScopedWarning(
  value: unknown,
  allowedFields: readonly string[],
): value is RecipeWarning {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["field", "message", "suggestedValue"])
  ) {
    return false;
  }

  return (
    typeof value.field === "string" &&
    allowedFields.includes(value.field) &&
    typeof value.message === "string" &&
    value.message.trim().length > 0 &&
    (value.suggestedValue === null ||
      typeof value.suggestedValue === "string" ||
      (typeof value.suggestedValue === "number" &&
        Number.isFinite(value.suggestedValue)))
  );
}

function normalizeProviderResult(value: unknown): unknown | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["draft", "warnings"]) ||
    !isRecord(value.draft) ||
    !Array.isArray(value.warnings) ||
    !value.warnings.every((warning) =>
      isScopedWarning(warning, RECIPE_WARNING_FIELDS),
    )
  ) {
    return null;
  }

  const draft = value.draft;

  if (
    !hasOnlyKeys(draft, [
      "title",
      "description",
      "servings",
      "cookingTimeMinutes",
      "source",
      "ingredients",
      "steps",
    ]) ||
    !Array.isArray(draft.ingredients) ||
    !Array.isArray(draft.steps)
  ) {
    return null;
  }

  const normalizedIngredients = [];
  const normalizedSteps = [];
  const warnings: RecipeWarning[] = [...value.warnings];

  for (const [index, ingredient] of draft.ingredients.entries()) {
    if (
      !isRecord(ingredient) ||
      !hasOnlyKeys(ingredient, ["name", "amount", "unit", "order", "warnings"]) ||
      !Array.isArray(ingredient.warnings) ||
      !ingredient.warnings.every((warning) =>
        isScopedWarning(warning, INGREDIENT_WARNING_FIELDS),
      )
    ) {
      return null;
    }

    normalizedIngredients.push({
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      order: ingredient.order,
    });
    warnings.push(
      ...ingredient.warnings.map((warning) => ({
        ...warning,
        field: `ingredients[${index}].${warning.field}`,
      })),
    );
  }

  for (const [index, step] of draft.steps.entries()) {
    if (
      !isRecord(step) ||
      !hasOnlyKeys(step, ["order", "description", "warnings"]) ||
      !Array.isArray(step.warnings) ||
      !step.warnings.every((warning) =>
        isScopedWarning(warning, STEP_WARNING_FIELDS),
      )
    ) {
      return null;
    }

    normalizedSteps.push({
      order: step.order,
      description: step.description,
    });
    warnings.push(
      ...step.warnings.map((warning) => ({
        ...warning,
        field: `steps[${index}].${warning.field}`,
      })),
    );
  }

  return {
    draft: {
      title: draft.title,
      description: draft.description,
      servings: draft.servings,
      cookingTimeMinutes: draft.cookingTimeMinutes,
      source: draft.source,
      ingredients: normalizedIngredients,
      steps: normalizedSteps,
    },
    warnings,
  };
}

function validateStructureRecipeResult(
  value: unknown,
): StructureRecipeValidationFailure | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["draft", "warnings"]) ||
    !isRecord(value.draft) ||
    !Array.isArray(value.warnings)
  ) {
    return "schema_mismatch";
  }

  const draft = value.draft;

  if (typeof draft.title === "string" && !draft.title.trim()) {
    return "blank_value";
  }

  if (
    !hasOnlyKeys(draft, [
      "title",
      "description",
      "servings",
      "cookingTimeMinutes",
      "source",
      "ingredients",
      "steps",
    ]) ||
    typeof draft.title !== "string" ||
    !isNullableString(draft.description) ||
    !isNullableString(draft.servings) ||
    draft.source !== null ||
    !Array.isArray(draft.ingredients) ||
    !Array.isArray(draft.steps)
  ) {
    return "schema_mismatch";
  }

  const isValidCookingTime =
    draft.cookingTimeMinutes === null ||
    (typeof draft.cookingTimeMinutes === "number" &&
      Number.isInteger(draft.cookingTimeMinutes) &&
      draft.cookingTimeMinutes >= 0);

  if (!isValidCookingTime) {
    return "schema_mismatch";
  }

  if (
    draft.ingredients.some(
      (ingredient) =>
        isRecord(ingredient) &&
        typeof ingredient.name === "string" &&
        !ingredient.name.trim(),
    ) ||
    draft.steps.some(
      (step) =>
        isRecord(step) &&
        typeof step.description === "string" &&
        !step.description.trim(),
    )
  ) {
    return "blank_value";
  }

  if (
    draft.ingredients.length === 0 ||
    !draft.ingredients.every(isIngredient) ||
    draft.steps.length === 0 ||
    !draft.steps.every(isRecipeStep)
  ) {
    return "schema_mismatch";
  }

  if (!hasSequentialOrders(draft.ingredients)) {
    return "ingredient_order";
  }

  if (!hasSequentialOrders(draft.steps)) {
    return "step_order";
  }

  const ingredientCount = draft.ingredients.length;
  const stepCount = draft.steps.length;

  for (const warning of value.warnings) {
    if (
      isRecord(warning) &&
      ((typeof warning.field === "string" && !warning.field.trim()) ||
        (typeof warning.message === "string" && !warning.message.trim()))
    ) {
      return "blank_value";
    }

    if (
      isRecord(warning) &&
      typeof warning.field === "string" &&
      !isEditableWarningField(
        warning.field,
        ingredientCount,
        stepCount,
      )
    ) {
      return "warning_field";
    }
  }

  return value.warnings.every((warning) =>
    isRecipeWarning(
      warning,
      ingredientCount,
      stepCount,
    ),
  )
    ? null
    : "schema_mismatch";
}

export function getStructureRecipeValidationFailure(
  value: unknown,
): StructureRecipeValidationFailure | null {
  return validateStructureRecipeResult(value);
}

export function isStructureRecipeResult(
  value: unknown,
): value is StructureRecipeResult {
  return validateStructureRecipeResult(value) === null;
}

export function parseProviderStructureRecipeResult(value: unknown): {
  result: StructureRecipeResult | null;
  failure: StructureRecipeValidationFailure | null;
} {
  const normalizedResult = normalizeProviderResult(value);

  if (!normalizedResult) {
    return { result: null, failure: "schema_mismatch" };
  }

  const failure = validateStructureRecipeResult(normalizedResult);

  return failure
    ? { result: null, failure }
    : { result: normalizedResult as StructureRecipeResult, failure: null };
}
