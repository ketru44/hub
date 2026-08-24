import { apiRequest } from "./apiClient";

const RECIPES_API_PATH = "/api/recipes";

export function getRecipes(idToken) {
  return apiRequest(RECIPES_API_PATH, { idToken });
}

export function structureRecipe(idToken, recipeInput) {
  return apiRequest("/api/ai/recipes/structure", {
    method: "POST",
    idToken,
    body: recipeInput,
  });
}

export function createRecipe(idToken, recipeRequest) {
  return apiRequest(RECIPES_API_PATH, {
    method: "POST",
    idToken,
    body: recipeRequest,
  });
}

export function getRecipeDetail(idToken, recipeId) {
  return apiRequest(`${RECIPES_API_PATH}/${recipeId}`, {
    method: "GET",
    idToken,
  });
}

export function updateRecipe(idToken, recipeId, recipeRequest) {
  return apiRequest(`${RECIPES_API_PATH}/${recipeId}`, {
    method: "PATCH",
    idToken,
    body: recipeRequest,
  });
}

export function deleteRecipe(idToken, recipeId) {
  return apiRequest(`${RECIPES_API_PATH}/${recipeId}`, {
    method: "DELETE",
    idToken,
  });
}
