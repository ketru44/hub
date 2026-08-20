import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { Link, Outlet, useMatch, useNavigate } from "react-router";
import { getRecipes } from "../api/recipeApi";
import { useAuth } from "../auth/authContext";
import RecipeList from "../components/RecipeList";
import { APP_ROUTES } from "../routePaths";
import {
  DEFAULT_RECIPE_FILTER_ID,
  matchesRecipeFilter,
  recipeFilters,
} from "../utils/recipeListFilters";
import { firebaseAuth } from "../firebase";

function RecipeBookLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTransferInvitationDialog = Boolean(
    useMatch(APP_ROUTES.transferInvitations),
  );
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState(DEFAULT_RECIPE_FILTER_ID);
  const [loadVersion, setLoadVersion] = useState(0);
  const [isBookLocked, setIsBookLocked] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isLogoutPendingRef = useRef(false);
  const mobileMenuButtonRef = useRef(null);
  const mobileMenuCloseButtonRef = useRef(null);
  const wasMobileMenuOpenRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadRecipes() {
      if (!user) {
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const idToken = await user.getIdToken();
        const userRecipes = await getRecipes(idToken);

        if (!isCancelled) {
          setRecipes(userRecipes);
        }
      } catch (requestError) {
        if (!isCancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "레시피를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRecipes();

    return () => {
      isCancelled = true;
    };
  }, [loadVersion, user]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      mobileMenuCloseButtonRef.current?.focus();
    } else if (wasMobileMenuOpenRef.current) {
      mobileMenuButtonRef.current?.focus();
    }

    wasMobileMenuOpenRef.current = isMobileMenuOpen;
  }, [isMobileMenuOpen]);

  function handleOpenTransferCode() {
    setIsMobileMenuOpen(false);
    navigate(APP_ROUTES.transferInvitations);
  }

  function handleOpenRecipeInput() {
    setIsMobileMenuOpen(false);
    navigate(APP_ROUTES.recipeNew);
  }

  async function handleLogout() {
    if (isLogoutPendingRef.current) {
      return;
    }

    isLogoutPendingRef.current = true;
    setIsLoggingOut(true);
    setLogoutError("");

    try {
      await signOut(firebaseAuth);
      navigate(APP_ROUTES.login, { replace: true });
    } catch {
      setLogoutError("로그아웃에 실패했어요. 다시 시도해 주세요.");
    } finally {
      isLogoutPendingRef.current = false;
      setIsLoggingOut(false);
    }
  }

  const isBackgroundLocked =
    isTransferInvitationDialog || isMobileMenuOpen;

  return (
    <main className="grid h-dvh grid-rows-[minmax(0,1fr)] place-items-stretch overflow-hidden bg-[radial-gradient(circle_at_50%_30%,#faf9f4,#e8e7e2_55%,#d7d6d1)] p-2.5 font-[Noto_Serif_KR,Nanum_Myeongjo,Malgun_Gothic,serif] text-[#272923] max-[700px]:flex max-[700px]:flex-col max-[700px]:p-0">
      <header
        className="hidden h-14 shrink-0 items-center gap-3 bg-[#15332a] bg-[url(/design-assets/cookbook/leather-texture-tile.png)] bg-center bg-size-[240px] px-4.5 text-base text-[#eed08b] max-[700px]:flex"
        inert={isBackgroundLocked || isBookLocked || undefined}
        aria-hidden={isBackgroundLocked || isBookLocked || undefined}
      >
        <button
          type="button"
          ref={mobileMenuButtonRef}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#aa8c4b] text-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3c580]"
          aria-label={isMobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-controls="mobile-navigation"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <span>나만의 레시피북</span>
        {logoutError ? (
          <p
            className="ml-auto max-w-32 text-right text-[11px] leading-tight text-[#ffd9cf]"
            role="alert"
          >
            {logoutError}
          </p>
        ) : null}
        <button
          type="button"
          className={`${logoutError ? "" : "ml-auto"} min-h-10 shrink-0 rounded-md border border-[#aa8c4b] px-2.5 text-xs text-[#f3e1b4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3c580] disabled:cursor-wait disabled:opacity-70`}
          aria-busy={isLoggingOut}
          disabled={isLoggingOut}
          onClick={handleLogout}
        >
          {isLoggingOut ? "로그아웃 중" : "로그아웃"}
        </button>
      </header>

      <div
        className="relative grid min-h-0 w-full min-w-0 max-w-[1580px] justify-self-center grid-cols-[186px_minmax(0,1fr)] overflow-hidden p-[36px_25px] drop-shadow-[0_11px_8px_rgb(21_25_20/0.3)] isolate before:pointer-events-none before:absolute before:inset-0 before:z-[-2] before:border-49 before:border-transparent before:[border-image:url(/design-assets/cookbook/leather-frame-9slice.png)_96_fill_stretch] before:content-[''] after:pointer-events-none after:absolute after:inset-[24px_28px_22px] after:z-[-1] after:rounded-[9px] after:bg-[#163229] after:bg-[url(/design-assets/cookbook/leather-texture-tile.png)] after:bg-center after:bg-size-[440px] after:shadow-[inset_0_0_28px_#06120e] after:content-[''] min-[1101px]:px-7.75 max-[1100px]:grid-cols-[155px_minmax(0,1fr)] max-[1100px]:pr-5 max-[700px]:flex-1 max-[700px]:grid-cols-1 max-[700px]:bg-[#15332a] max-[700px]:bg-[url(/design-assets/cookbook/leather-texture-tile.png)] max-[700px]:bg-center max-[700px]:bg-size-[300px] max-[700px]:p-3 max-[700px]:drop-shadow-none max-[700px]:before:hidden max-[700px]:after:hidden short-screen:py-7"
        inert={isBackgroundLocked || undefined}
        aria-hidden={isBackgroundLocked || undefined}
      >
        <aside
          className="flex h-full min-h-0 flex-col items-center overflow-hidden bg-[linear-gradient(90deg,transparent,#102b23_18%,#102b23_82%,transparent)] px-2.5 pb-6.5 pt-11.25 text-[#e3c580] max-[700px]:hidden short-screen:pt-7.5"
          inert={isBookLocked || undefined}
          aria-hidden={isBookLocked || undefined}
        >
          <div className="text-center text-[21px] leading-normal tracking-[0.08em]">
            <img
              src="/design-assets/cookbook/gold-book-emblem.png"
              alt="펼쳐진 책 금박 문양"
              className="mx-auto mb-1.5 block h-15.25 w-19.5 object-contain"
            />
            <strong className="font-medium">
              나만의
              <br />
              레시피북
            </strong>
          </div>
          <nav
            className="mt-7.5 grid w-full gap-1.25 short-screen:mt-5 short-screen:gap-0.5"
            aria-label="주 메뉴"
          >
            <button
              type="button"
              className="min-h-13.25 rounded-lg border border-[#aa8c4b] bg-[rgb(213_178_101/8%)] px-3.25 text-left text-base text-[#eed08b] short-screen:min-h-10.75"
              disabled
            >
              레시피북
            </button>
            <button
              type="button"
              className="min-h-13.25 rounded-lg border border-transparent px-3.25 text-left text-base text-[#eed08b] hover:bg-[rgb(255_244_204/7%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3c580] short-screen:min-h-10.75"
              onClick={handleOpenTransferCode}
            >
              전달 코드
            </button>
          </nav>
          <div
            className="mt-2 grid w-[calc(100%-10px)] gap-px border-t border-[rgb(220_193_126/32%)] pt-2"
            aria-label="레시피북 필터"
          >
            {recipeFilters.map((filter) => {
              const isActive = activeFilter === filter.id;
              const count = recipes.filter((recipe) =>
                matchesRecipeFilter(recipe, filter.id),
              ).length;

              return (
                <button
                  key={filter.id}
                  type="button"
                  className={`flex min-h-7.25 items-center justify-between rounded px-2 text-xs text-[#d8d2bd] hover:bg-[rgb(255_244_204/7%)] ${isActive ? "bg-[rgb(255_244_204/7%)]" : ""}`}
                  aria-pressed={isActive}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  <span>{filter.label}</span>
                  <small className="text-[11px] text-[#e7c981]">
                    {count}
                  </small>
                </button>
              );
            })}
          </div>
          <div className="mt-auto w-[calc(100%-10px)] border-t border-[rgb(220_193_126/32%)] pt-3">
            {logoutError ? (
              <p
                className="mb-2 text-xs leading-relaxed text-[#ffd9cf]"
                role="alert"
              >
                {logoutError}
              </p>
            ) : null}
            <button
              type="button"
              className="min-h-9 w-full rounded-md border border-[#aa8c4b] px-2.5 text-xs text-[#f3e1b4] hover:bg-[rgb(255_244_204/7%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3c580] disabled:cursor-wait disabled:opacity-70"
              aria-busy={isLoggingOut}
              disabled={isLoggingOut}
              onClick={handleLogout}
            >
              {isLoggingOut ? "로그아웃 중" : "로그아웃"}
            </button>
          </div>
        </aside>

        <div className="book-spread grid min-h-0 min-w-0 grid-cols-2 drop-shadow-[0_3px_3px_rgb(44_35_20/0.23)] max-[1100px]:grid-cols-1 max-[700px]:block max-[700px]:h-full">
          <section
            className="book-list-page relative min-w-0 overflow-hidden rounded-l-[3px] bg-[#f8f5eb] bg-[radial-gradient(circle_at_30%_40%,rgb(255_255_255/85%),transparent_60%)] shadow-[inset_-12px_0_23px_-20px_#4f3a20] min-[1101px]:shadow-[inset_-12px_0_23px_-20px_#4f3a20,-3px_0_0_#f1ece1,-6px_0_0_#d8cfbd] max-[700px]:h-full max-[700px]:rounded-[5px]"
            inert={isBookLocked || undefined}
            aria-hidden={isBookLocked || undefined}
          >
            <RecipeList
              activeFilter={activeFilter}
              error={error}
              isLoading={isLoading}
              onFilterChange={setActiveFilter}
              onRetry={() => setLoadVersion((value) => value + 1)}
              recipes={recipes}
              userName={user?.displayName}
            />
            <button
              type="button"
              className="absolute bottom-7.5 left-1/2 h-13.5 -translate-x-1/2 whitespace-nowrap rounded-[9px] border border-[#061c16] bg-[#15332a] bg-[url(/design-assets/cookbook/leather-texture-tile.png)] bg-center bg-size-[220px] px-7.25 text-[#f3e1b4] max-[700px]:bottom-4.5 max-[700px]:h-11.5 short-screen:bottom-5.5 short-screen:h-11.75"
              onClick={handleOpenRecipeInput}
            >
              새 레시피 기록
            </button>
          </section>

          <section
            className="book-right-page min-w-0 overflow-hidden rounded-r bg-[#f8f5eb] bg-[radial-gradient(circle_at_30%_40%,rgb(255_255_255/85%),transparent_60%)] shadow-[inset_15px_0_26px_-24px_#3f2d17] min-[1101px]:shadow-[inset_15px_0_26px_-24px_#3f2d17,3px_0_0_#f1ece1,6px_0_0_#d8cfbd]"
            aria-label="오른쪽 레시피 페이지"
          >
            <Outlet
              context={{
                refreshRecipes: () =>
                  setLoadVersion((value) => value + 1),
                removeRecipe: (recipeId) =>
                  setRecipes((currentRecipes) =>
                    currentRecipes.filter(
                      (recipe) => recipe.id !== recipeId,
                    ),
                  ),
                setIsBookLocked,
              }}
            />
          </section>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <div
          className="fixed inset-0 z-40 flex bg-[rgb(3_14_10/72%)] min-[701px]:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsMobileMenuOpen(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsMobileMenuOpen(false);
            }
          }}
        >
          <aside
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="모바일 메뉴"
            className="flex h-full w-[min(19rem,86vw)] flex-col bg-[#102b23] bg-[url(/design-assets/cookbook/leather-texture-tile.png)] bg-center bg-size-[300px] p-5 text-[#f3e1b4] shadow-[14px_0_36px_rgb(0_0_0/38%)]"
          >
            <div className="flex items-center justify-between border-b border-[rgb(220_193_126/32%)] pb-4">
              <strong className="font-medium tracking-[0.06em]">
                나만의 레시피북
              </strong>
              <button
                type="button"
                ref={mobileMenuCloseButtonRef}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-[#aa8c4b] text-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3c580]"
                aria-label="메뉴 닫기"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <nav className="mt-5 grid gap-2" aria-label="모바일 주 메뉴">
              <Link
                to={APP_ROUTES.recipes}
                className="flex min-h-12 items-center rounded-lg border border-[#aa8c4b] px-4 text-[#eed08b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3c580]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                레시피북
              </Link>
              <Link
                to={APP_ROUTES.recipeNew}
                className="flex min-h-12 items-center rounded-lg border border-transparent px-4 text-[#eed08b] hover:bg-[rgb(255_244_204/7%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3c580]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                새 레시피 기록
              </Link>
              <Link
                to={APP_ROUTES.transferInvitations}
                className="flex min-h-12 items-center rounded-lg border border-transparent px-4 text-[#eed08b] hover:bg-[rgb(255_244_204/7%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3c580]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                전달 코드
              </Link>
            </nav>
          </aside>
        </div>
      ) : null}
    </main>
  );
}

export default RecipeBookLayout;
