import { RECIPE_TYPES } from "./recipeTypes";

export const DEFAULT_RECIPE_FILTER_ID = "all";

export const recipeFilters = [
  { id: DEFAULT_RECIPE_FILTER_ID, label: "모든 레시피" },
  { id: "owned", label: "내가 등록한" },
  { id: "received", label: "전달받은" },
];

export function matchesRecipeFilter(recipe, filterId) {
  if (filterId === "owned") {
    return (
      recipe.type === RECIPE_TYPES.OWNED ||
      recipe.type === RECIPE_TYPES.EXTERNAL
    );
  }

  return (
    filterId !== "received" ||
    recipe.type === RECIPE_TYPES.RECEIVED
  );
}
