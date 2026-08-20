import { Link } from "react-router";
import { getRecipeDetailPath } from "../routePaths";
import {
  matchesRecipeFilter,
  recipeFilters,
} from "../utils/recipeListFilters";
import { RECIPE_TYPE_LABELS } from "../utils/recipeTypes";

function RecipeList({
  activeFilter,
  error,
  isLoading,
  onFilterChange,
  onRetry,
  recipes,
  userName,
}) {
  const filteredRecipes = recipes.filter((recipe) =>
    matchesRecipeFilter(recipe, activeFilter),
  );

  return (
    <div className="h-full overflow-y-auto p-[50px_46px_120px_36px] max-[700px]:p-[25px_22px_84px] short-screen:p-[30px_34px_92px]">
      <header>
        <h1 className="mb-3.25 text-[31px] font-semibold tracking-[0.09em] max-[700px]:mb-2 max-[700px]:text-[25px] short-screen:mb-2 short-screen:text-[26px]">
          {userName ?? "나"}의 레시피북
        </h1>
      </header>

      <div
        className="mt-4.25 hidden gap-1.5 overflow-x-auto max-[700px]:flex"
        aria-label="레시피 필터"
      >
        {recipeFilters.map((filter) => {
          const isActive = activeFilter === filter.id;

          return (
            <button
              key={filter.id}
              type="button"
              className={`shrink-0 rounded-full border px-2.5 py-1.75 text-[11px] ${isActive ? "border-[#aa8c4b] bg-[#15332a] text-[#f3e1b4]" : "border-[#d5cdbb] text-[#626157]"}`}
              aria-pressed={isActive}
              onClick={() => onFilterChange(filter.id)}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <p
          className="mt-6.75 border border-dashed border-[#c9bea7] px-4.5 py-9 text-center text-[13px] text-[#626157]"
          role="status"
        >
          레시피를 불러오는 중입니다.
        </p>
      ) : null}

      {!isLoading && error ? (
        <div className="mt-6.75 rounded-[9px] border border-[#c79181] bg-[#fcf1ed] p-4.5">
          <p className="text-[13px] text-[#7f3c29]">{error}</p>
          <button
            type="button"
            className="mt-3 rounded-md bg-[#15332a] px-3 py-2 text-[#f3e1b4]"
            onClick={onRetry}
          >
            다시 시도
          </button>
        </div>
      ) : null}

      {!isLoading && !error && filteredRecipes.length === 0 ? (
        <div className="mt-6.75 border border-dashed border-[#c9bea7] px-4.5 py-9 text-center text-[13px] text-[#626157]">
          <h2 className="mb-2.5 text-[18px] font-medium text-[#272923]">
            아직 레시피가 없습니다.
          </h2>
          <p className="leading-[1.6]">첫 번째 레시피를 기록해 보세요.</p>
          <p className="mt-1 leading-[1.6]">
            URL이나 기억나는 내용을 사용해 시작할 수 있습니다.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && filteredRecipes.length > 0 ? (
        <div className="mt-6.75 border-t border-[#c9bea7] max-[700px]:mt-3">
          {filteredRecipes.map((recipe) => {
            const sourceOrRelationship =
              recipe.source?.title ??
              recipe.source?.url ??
              recipe.receivedInfo?.senderDisplayName ??
              null;

            return (
              <Link
                key={recipe.id}
                to={getRecipeDetailPath(recipe.id)}
                className="flex min-h-28 justify-between gap-4 border-b border-[#d8cfbd] pb-4 pl-2.5 pt-5.5 hover:bg-[#f1ece1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15332a] max-[700px]:min-h-19 max-[700px]:gap-2.5 max-[700px]:px-0 max-[700px]:py-3 short-screen:min-h-23 short-screen:py-3.5"
              >
                <div className="min-w-0">
                  <h2 className="mb-2.25 text-[22px] font-medium max-[700px]:mb-1.25 max-[700px]:text-[17px] short-screen:mb-1.5 short-screen:text-[19px]">
                    {recipe.title}
                  </h2>
                  {recipe.description ? (
                    <p className="mb-3 text-xs leading-normal text-[#777469]">
                      {recipe.description}
                    </p>
                  ) : null}
                  <div className="flex gap-2.5 text-xs text-[#68675e]">
                    <span>{RECIPE_TYPE_LABELS[recipe.type]}</span>
                    {sourceOrRelationship ? (
                      <span>{sourceOrRelationship}</span>
                    ) : null}
                  </div>
                </div>
                <time
                  className="self-center whitespace-nowrap text-xs text-[#68675e]"
                  dateTime={recipe.createdAt}
                >
                  {new Date(recipe.createdAt).toLocaleDateString("ko-KR")}
                </time>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default RecipeList;
