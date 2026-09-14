import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

import App from "../App";
import { AuthContext } from "../auth/authContext";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

function renderRoute(path, fetchMock) {
  vi.stubGlobal(
    "fetch",
    fetchMock ??
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
  );

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
}

describe("RecipeBook routes", () => {
  it("목록과 추가 route가 같은 책형 layout을 유지하며 독립 page를 렌더링한다", async () => {
    renderRoute("/recipes/new");

    expect(
      await screen.findByRole("heading", { name: "요리사의 레시피북" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "레시피를 들려주세요" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "오른쪽 레시피 페이지" }),
    ).toContainElement(screen.getByTestId("recipe-new-page"));
  });

  it("전달 코드 route를 책형 layout 위 dialog page로 렌더링한다", async () => {
    renderRoute("/transfer-invitations");

    expect(
      await screen.findByRole("heading", {
        name: "요리사의 레시피북",
        hidden: true,
      }),
    ).toBeInTheDocument();
    const dialog = screen.getByRole("dialog", {
      name: "전달 코드로 레시피 받기",
    });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText("전달 코드")).toHaveFocus();

    fireEvent.keyDown(dialog.parentElement, { key: "Escape" });
    expect(
      await screen.findByRole("heading", { name: "레시피를 들려주세요" }),
    ).toBeInTheDocument();
  });

  it("추가 page가 AI 구조화 성공 결과를 초안 route로 전달한다", async () => {
    const structuredRecipe = {
      draft: {
        title: "김치찌개",
        description: null,
        servings: "2인분",
        cookingTimeMinutes: 30,
        ingredients: [
          { name: "김치", amount: "200", unit: "g", order: 1 },
        ],
        steps: [{ order: 1, description: "김치를 볶는다." }],
        source: null,
      },
      warnings: [],
    };
    const fetchMock = vi.fn((path) =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data:
              path === "/api/ai/recipes/structure"
                ? structuredRecipe
                : [],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );
    renderRoute("/recipes/new", fetchMock);

    fireEvent.change(screen.getByLabelText(/직접 입력/), {
      target: { value: "김치를 볶고 물을 넣는다." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "레시피 정리하기" }),
    );

    expect(
      await screen.findByRole("heading", { name: "레시피 초안 확인" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/recipes/structure",
      expect.objectContaining({ method: "POST" }),
    );
    await waitFor(() => {
      const eventNames = fetchMock.mock.calls
        .filter(([path]) => path === "/api/analytics/events")
        .map(([, request]) => JSON.parse(request.body).eventName);

      expect(eventNames).toHaveLength(3);
      expect(eventNames).toEqual(expect.arrayContaining([
        "recipe_input_started",
        "recipe_structure_requested",
        "recipe_structure_succeeded",
      ]));
    });
  });

  it("AI 구조화 실패를 범주화해 기록하고 입력과 오류를 유지한다", async () => {
    const fetchMock = vi.fn((path) => {
      if (path === "/api/ai/recipes/structure") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              error: {
                code: "AI_RESPONSE_INVALID",
                message: "AI 응답 형식이 올바르지 않습니다.",
              },
            }),
            {
              status: 502,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: path === "/api/analytics/events" ? { id: "event-id" } : [],
          }),
          {
            status: path === "/api/analytics/events" ? 201 : 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    });
    renderRoute("/recipes/new", fetchMock);
    const rawTextInput = screen.getByLabelText(/직접 입력/);

    fireEvent.change(rawTextInput, {
      target: { value: "김치를 볶고 물을 넣는다." },
    });
    fireEvent.click(screen.getByRole("button", { name: "레시피 정리하기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AI 응답 형식이 올바르지 않습니다.",
    );
    expect(rawTextInput).toHaveValue("김치를 볶고 물을 넣는다.");
    await waitFor(() => {
      const failedEvent = fetchMock.mock.calls
        .filter(([path]) => path === "/api/analytics/events")
        .map(([, request]) => JSON.parse(request.body))
        .find(({ eventName }) => eventName === "recipe_structure_failed");

      expect(failedEvent).toMatchObject({
        properties: {
          inputType: "manual",
          errorType: "schema_validation",
        },
      });
      expect(failedEvent.properties.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  it("전달 코드 Dialog backdrop을 누르면 추가 page로 돌아간다", async () => {
    renderRoute("/transfer-invitations");

    const dialog = screen.getByRole("dialog", {
      name: "전달 코드로 레시피 받기",
    });
    fireEvent.mouseDown(dialog.parentElement);

    expect(
      await screen.findByRole("heading", { name: "레시피를 들려주세요" }),
    ).toBeInTheDocument();
  });
});
