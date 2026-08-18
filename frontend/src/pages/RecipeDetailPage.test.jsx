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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const summary = {
  id: "recipe-id",
  type: "OWNED",
  title: "김치찌개",
  description: null,
  source: null,
  receivedInfo: null,
  createdAt: "2026-08-18T00:00:00.000Z",
};

const detail = {
  ...summary,
  ownerId: "user-id",
  servings: "2인분",
  cookingTimeMinutes: 30,
  ingredients: [],
  steps: [],
  memo: null,
  updatedAt: "2026-08-18T00:00:00.000Z",
};

function renderDetail(fetchMock) {
  vi.stubGlobal("fetch", fetchMock);
  const user = {
    displayName: "요리사",
    getIdToken: vi.fn().mockResolvedValue("firebase-token"),
  };

  render(
    <AuthContext.Provider value={{ user, isLoading: false }}>
      <MemoryRouter initialEntries={["/recipes/recipe-id"]}>
        <App />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("RecipeDetailPage", () => {
  it("상세 로딩과 오류를 표시하고 목록 복귀를 제공한다", async () => {
    const fetchMock = vi.fn((path) =>
      Promise.resolve(
        path === "/api/recipes/recipe-id"
          ? new Response(
              JSON.stringify({
                error: {
                  code: "RECIPE_NOT_FOUND",
                  message: "레시피를 찾을 수 없습니다.",
                },
              }),
              {
                status: 404,
                headers: { "Content-Type": "application/json" },
              },
            )
          : new Response(JSON.stringify({ data: [] }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
      ),
    );

    renderDetail(fetchMock);

    expect(
      screen.getByText("레시피 상세를 불러오는 중입니다."),
    ).toBeInTheDocument();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("레시피를 찾을 수 없습니다.");
    expect(
      within(alert).getByRole("link", { name: "목록으로 돌아가기" }),
    ).toHaveAttribute("href", "/recipes");
  });

  it("조리 중 보기에서 상세 본문을 유지하고 책 내비게이션을 잠근다", async () => {
    renderDetail(
      vi.fn((path) =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              data: path === "/api/recipes/recipe-id" ? detail : [summary],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
      ),
    );

    const region = await screen.findByRole("region", {
      name: "레시피 상세",
    });
    fireEvent.click(within(region).getByRole("switch"));

    expect(within(region).getByText("김치찌개")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "주 메뉴", hidden: true })
        .closest("aside"),
    ).toHaveAttribute("inert");
    expect(
      within(region).queryByRole("button", { name: "⋯ 관리" }),
    ).toBeNull();
  });

  it("삭제 성공 후 목록으로 이동하고 Layout 목록에서 제거한다", async () => {
    const fetchMock = vi.fn((path, request = {}) => {
      if (request.method === "DELETE") {
        return Promise.resolve(
          new Response(JSON.stringify({ data: { id: "recipe-id" } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: path === "/api/recipes/recipe-id" ? detail : [summary],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    });
    renderDetail(fetchMock);

    const region = await screen.findByRole("region", {
      name: "레시피 상세",
    });
    fireEvent.click(within(region).getByRole("button", { name: "⋯ 관리" }));
    fireEvent.click(
      within(region).getByRole("button", { name: "레시피 삭제" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "레시피를 삭제할까요?",
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "레시피 삭제" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "어떤 레시피를 펼쳐볼까요?" }),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByRole("link", { name: /김치찌개/ })).toBeNull();
  });

  it("삭제 실패 후 상세과 확인 dialog를 유지하고 재시도한다", async () => {
    const deleteResponses = [
      new Response(
        JSON.stringify({
          error: { code: "INTERNAL_ERROR", message: "삭제 실패" },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      ),
      new Response(JSON.stringify({ data: { id: "recipe-id" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ];
    const fetchMock = vi.fn((path, request = {}) => {
      if (request.method === "DELETE") {
        return Promise.resolve(deleteResponses.shift());
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: path === "/api/recipes/recipe-id" ? detail : [summary],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    });
    renderDetail(fetchMock);

    const region = await screen.findByRole("region", {
      name: "레시피 상세",
    });
    fireEvent.click(within(region).getByRole("button", { name: "⋯ 관리" }));
    fireEvent.click(
      within(region).getByRole("button", { name: "레시피 삭제" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "레시피를 삭제할까요?",
    });
    const deleteButton = within(dialog).getByRole("button", {
      name: "레시피 삭제",
    });

    fireEvent.click(deleteButton);
    fireEvent.click(deleteButton);
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "삭제 실패",
    );
    expect(fetchMock.mock.calls.filter(([, options]) =>
      options?.method === "DELETE")).toHaveLength(1);
    expect(region).toBeInTheDocument();

    fireEvent.click(deleteButton);
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([, options]) =>
        options?.method === "DELETE")).toHaveLength(2),
    );
  });
});
