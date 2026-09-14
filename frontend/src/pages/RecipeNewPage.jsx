import { useNavigate } from "react-router";
import { structureRecipe } from "../api/recipeApi";
import {
  getAnalyticsSessionId,
  getRecipeInputType,
  mapStructureErrorType,
  trackAnalyticsEvent,
} from "../api/analyticsApi";
import { useAuth } from "../auth/authContext";
import RecipeInputForm from "../components/RecipeInputForm";
import { APP_ROUTES } from "../routePaths";

function RecipeNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  function handleInputStarted(inputType) {
    if (!user) {
      return;
    }

    const sessionId = getAnalyticsSessionId();

    void user.getIdToken()
      .then((idToken) =>
        trackAnalyticsEvent(
          idToken,
          "recipe_input_started",
          { inputType },
          sessionId,
        ),
      )
      .catch(() => undefined);
  }

  async function handlePrepareRecipe(recipeInput) {
    if (!user) {
      throw new Error("로그인 정보를 확인할 수 없습니다.");
    }

    const idToken = await user.getIdToken();
    const inputType = getRecipeInputType(recipeInput);
    const sessionId = getAnalyticsSessionId();

    void trackAnalyticsEvent(
      idToken,
      "recipe_structure_requested",
      { inputType },
      sessionId,
    );
    const startedAt = performance.now();

    try {
      const structuredRecipe = await structureRecipe(idToken, recipeInput);

      void trackAnalyticsEvent(
        idToken,
        "recipe_structure_succeeded",
        {
          inputType,
          latencyMs: performance.now() - startedAt,
          warningCount: structuredRecipe.warnings.length,
        },
        sessionId,
      );

      navigate(APP_ROUTES.recipeDraft, {
        state: {
          ...structuredRecipe,
          analytics: { inputType, sessionId },
        },
      });
    } catch (error) {
      void trackAnalyticsEvent(
        idToken,
        "recipe_structure_failed",
        {
          inputType,
          errorType: mapStructureErrorType(error),
          latencyMs: performance.now() - startedAt,
        },
        sessionId,
      );
      throw error;
    }
  }

  return (
    <div
      data-book-right-page
      data-testid="recipe-new-page"
      className="h-full overflow-y-auto p-[50px_42px_38px] max-[1100px]:p-[38px_42px] max-[700px]:p-[25px_22px_24px] short-screen:p-[30px_34px_24px]"
    >
      <RecipeInputForm
        onCancel={() => navigate(APP_ROUTES.recipes)}
        onOpenTransferCode={() => navigate(APP_ROUTES.transferInvitations)}
        onInputStarted={handleInputStarted}
        onPrepare={handlePrepareRecipe}
      />
    </div>
  );
}

export default RecipeNewPage;
