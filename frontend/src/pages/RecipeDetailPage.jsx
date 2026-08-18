import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router";
import { deleteRecipe, getRecipeDetail } from "../api/recipeApi";
import { useAuth } from "../auth/authContext";
import RecipeDetailView from "../components/RecipeDetailView";

function RecipeDetailPage() {
  const { user } = useAuth();
  const { recipeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { removeRecipe, setIsBookLocked } = useOutletContext();
  const [recipeDetail, setRecipeDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCookingMode, setIsCookingMode] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadRecipeDetail() {
      setRecipeDetail(null);
      setIsLoading(true);
      setError("");

      try {
        const idToken = await user.getIdToken();
        const detail = await getRecipeDetail(idToken, recipeId);

        if (!isCancelled) {
          setRecipeDetail(detail);
        }
      } catch (requestError) {
        if (!isCancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "레시피 상세를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRecipeDetail();

    return () => {
      isCancelled = true;
      setIsBookLocked(false);
    };
  }, [recipeId, setIsBookLocked, user]);

  async function handleDeleteRecipe() {
    const idToken = await user.getIdToken();
    await deleteRecipe(idToken, recipeId);
    removeRecipe(recipeId);
    navigate("/recipes", { replace: true });
  }

  function handleCookingModeChange(nextCookingMode) {
    setIsCookingMode(nextCookingMode);
    setIsBookLocked(nextCookingMode);
  }

  return (
    <div data-book-right-page className="h-full">
      {isLoading ? (
        <div className="flex h-full items-center justify-center p-8">
          <p className="text-center text-sm text-[#626157]" role="status">
            레시피 상세를 불러오는 중입니다.
          </p>
        </div>
      ) : null}
      {!isLoading && error ? (
        <div className="flex h-full items-center justify-center p-8">
          <div
            className="w-full max-w-sm rounded-lg border border-[#c79181] bg-[#fcf1ed] p-5 text-center"
            role="alert"
          >
            <p className="text-sm text-[#7f3c29]">{error}</p>
            <Link
              to="/recipes"
              className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[#15332a] px-4 text-sm text-[#f3e1b4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15332a]"
            >
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      ) : null}
      {recipeDetail ? (
        <RecipeDetailView
          key={recipeDetail.id}
          isCookingMode={isCookingMode}
          isReceivedRecipeSaved={location.state?.receivedRecipeSaved}
          onCookingModeChange={handleCookingModeChange}
          onDelete={handleDeleteRecipe}
          recipeDetail={recipeDetail}
          recipeId={recipeId}
          user={user}
        />
      ) : null}
    </div>
  );
}

export default RecipeDetailPage;
