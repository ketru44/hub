import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

import App from "../App";
import { AuthContext } from "../auth/authContext";

const { signOutMock } = vi.hoisted(() => ({ signOutMock: vi.fn() }));

vi.mock("firebase/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  signOut: signOutMock,
}));
vi.mock("../firebase", () => ({ firebaseAuth: {} }));

afterEach(() => {
  cleanup();
  signOutMock.mockReset();
  vi.unstubAllGlobals();
});

function renderApp(path = "/recipes") {
  const user = {
    displayName: "요리사",
    getIdToken: vi.fn().mockResolvedValue("firebase-token"),
  };

  render(
    <AuthContext.Provider value={{ user, isLoading: false }}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  return user;
}

describe("RecipeBookLayout", () => {
  it("목록의 로딩과 빈 상태를 순서대로 표시한다", async () => {
    let resolveRecipes;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveRecipes = resolve;
        }),
      ),
    );

    renderApp();

    expect(
      screen.getByRole("status", { name: "" }),
    ).toHaveTextContent("레시피를 불러오는 중입니다.");

    resolveRecipes(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(
      await screen.findByText("아직 레시피가 없습니다."),
    ).toBeInTheDocument();
  });

  it("목록 오류 후 다시 시도하고 유형 필터를 적용한다", async () => {
    const recipes = [
      {
        id: "owned-id",
        type: "OWNED",
        title: "된장찌개",
        description: null,
        source: null,
        receivedInfo: null,
        createdAt: "2026-08-18T00:00:00.000Z",
      },
      {
        id: "received-id",
        type: "RECEIVED",
        title: "김치찌개",
        description: null,
        source: null,
        receivedInfo: { senderDisplayName: "엄마" },
        createdAt: "2026-08-18T00:00:00.000Z",
      },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { code: "INTERNAL_ERROR", message: "목록 오류" },
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: recipes }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderApp();

    expect(await screen.findByText("목록 오류")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    await screen.findByRole("link", { name: /된장찌개/ });

    const mobileFilters = screen.getByLabelText("레시피 필터");
    fireEvent.click(
      within(mobileFilters).getByRole("button", { name: "전달받은" }),
    );

    expect(screen.queryByRole("link", { name: /된장찌개/ })).toBeNull();
    expect(screen.getByRole("link", { name: /김치찌개/ })).toBeInTheDocument();
  });

  it("모바일 메뉴를 Escape로 닫고 트리거로 초점을 복귀한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    renderApp();

    const trigger = screen.getByRole("button", { name: "메뉴 열기" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "모바일 메뉴" });
    expect(within(dialog).getByRole("button", { name: "메뉴 닫기" }))
      .toHaveFocus();

    fireEvent.keyDown(dialog.parentElement, { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("로그아웃 처리 중 중복 실행을 막는다", async () => {
    let resolveSignOut;
    signOutMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSignOut = resolve;
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    renderApp();

    const buttons = screen.getAllByRole("button", { name: "로그아웃" });
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getAllByRole("button", { name: "로그아웃 중" }),
    ).toHaveLength(2);

    resolveSignOut();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Google 계정으로 로그인" }),
      ).toBeInTheDocument(),
    );
  });
});
