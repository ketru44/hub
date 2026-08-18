import { useNavigate } from "react-router";
import { structureRecipe } from "../api/recipeApi";
import { useAuth } from "../auth/authContext";
import RecipeInputForm from "../components/RecipeInputForm";

function RecipeNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handlePrepareRecipe(recipeInput) {
    if (!user) {
      throw new Error("로그인 정보를 확인할 수 없습니다.");
    }

    const idToken = await user.getIdToken();
    const structuredRecipe = await structureRecipe(idToken, recipeInput);

    navigate("/recipes/draft", { state: structuredRecipe });
  }

  return (
    <div
      data-book-right-page
      data-testid="recipe-new-page"
      className="h-full overflow-y-auto p-[50px_42px_38px] max-[1100px]:p-[38px_42px] max-[700px]:p-[25px_22px_24px] short-screen:p-[30px_34px_24px]"
    >
      <RecipeInputForm
        onCancel={() => navigate("/recipes")}
        onOpenTransferCode={() => navigate("/transfer-invitations")}
        onPrepare={handlePrepareRecipe}
      />
    </div>
  );
}

export default RecipeNewPage;
