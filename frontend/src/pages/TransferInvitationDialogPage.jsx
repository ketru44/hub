import { createPortal } from "react-dom";
import { useNavigate, useOutletContext } from "react-router";
import { APP_ROUTES } from "../routePaths";
import TransferInvitationPage from "./TransferInvitationPage";

function TransferInvitationDialogPage() {
  const navigate = useNavigate();
  const { refreshRecipes } = useOutletContext();

  function handleClose() {
    navigate(APP_ROUTES.recipeNew);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgb(3_14_10/78%)] p-4 backdrop-blur-[2px] max-[700px]:items-end max-[700px]:p-2"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          handleClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-code-dialog-title"
        className="relative max-h-[min(760px,calc(100dvh-32px))] w-full max-w-xl overflow-y-auto rounded-[5px] border border-[#c9bea7] bg-[#f8f5eb] p-5 text-[#272923] shadow-[0_26px_90px_rgb(0_0_0/52%)] sm:p-7 max-[700px]:max-h-[calc(100dvh-16px)] max-[700px]:rounded-[5px_5px_0_0]"
      >
        <header className="mb-5 border-b border-[#d8cfbd] pb-4 pr-12">
          <p className="text-xs font-semibold tracking-[0.12em] text-[#8b6e35]">
            전달받은 레시피
          </p>
          <h2
            id="transfer-code-dialog-title"
            className="mt-2 text-2xl font-semibold tracking-[0.04em]"
          >
            전달 코드로 레시피 받기
          </h2>
        </header>
        <button
          type="button"
          aria-label="닫기"
          onClick={handleClose}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#c9bea7] bg-[#fbf7eb] text-xl text-[#31523d] hover:bg-[#eee7d9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b6e35]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
          >
            <path
              d="M6 6 18 18M18 6 6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <TransferInvitationPage
          isDialog
          onRecipeSaved={refreshRecipes}
        />
      </section>
    </div>,
    document.body,
  );
}

export default TransferInvitationDialogPage;
