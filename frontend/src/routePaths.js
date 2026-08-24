export const APP_ROUTES = {
  login: "/",
  recipes: "/recipes",
  recipeNew: "/recipes/new",
  recipeDraft: "/recipes/draft",
  recipeDetail: "/recipes/:recipeId",
  recipeEdit: "/recipes/:recipeId/edit",
  transferInvitations: "/transfer-invitations",
  transferInvitation: "/transfer-invitations/:linkToken",
};

export function getRecipeDetailPath(recipeId) {
  return `${APP_ROUTES.recipes}/${recipeId}`;
}

export function getRecipeEditPath(recipeId) {
  return `${getRecipeDetailPath(recipeId)}/edit`;
}
