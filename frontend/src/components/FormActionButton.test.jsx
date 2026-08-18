import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import FormActionButton from "./FormActionButton";

afterEach(cleanup);

describe("FormActionButton", () => {
  it.each([
    ["primary", "저장"],
    ["secondary", "취소"],
    ["danger", "삭제"],
  ])("%s 폼 액션을 button 속성과 함께 렌더링한다", (variant, label) => {
    render(
      <FormActionButton
        type="submit"
        variant={variant}
        disabled
        aria-busy="true"
      >
        {label}
      </FormActionButton>,
    );

    const button = screen.getByRole("button", { name: label });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
