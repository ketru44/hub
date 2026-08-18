export const recipeFilters = [
  { id: "all", label: "모든 레시피" },
  { id: "owned", label: "내가 등록한" },
  { id: "received", label: "전달받은" },
];

export function matchesRecipeFilter(recipe, filterId) {
  if (filterId === "owned") {
    return recipe.type === "OWNED" || recipe.type === "EXTERNAL";
  }

  return filterId !== "received" || recipe.type === "RECEIVED";
}
