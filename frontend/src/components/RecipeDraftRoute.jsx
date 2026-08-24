import { Navigate, useLocation } from "react-router";
import { APP_ROUTES } from "../routePaths";

function RecipeDraftRoute({ children }) {
  const { state } = useLocation();
  const draft = state?.draft;

  const hasValidDraft =
    typeof draft?.title === "string" &&
    draft.title.trim().length > 0 &&
    Array.isArray(draft.ingredients) &&
    draft.ingredients.length > 0 &&
    Array.isArray(draft.steps) &&
    draft.steps.length > 0 &&
    Array.isArray(state?.warnings);

  if (!hasValidDraft) {
    return <Navigate to={APP_ROUTES.recipeNew} replace />;
  }

  return children
}

export default RecipeDraftRoute;
