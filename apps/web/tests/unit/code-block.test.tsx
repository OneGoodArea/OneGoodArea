// @vitest-environment jsdom

/* AR-240: Component tests for <CodeBlock>. Covers the acceptance
   criteria from the Jira ticket: renders, copy click fires
   clipboard write, header rendered, line numbers count matches
   input, dark surface variant, all three grammars highlight tokens. */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CodeBlock } from "@/app/design-v2/_shared/dashboard/code-block";

describe("<CodeBlock> (AR-240)", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("renders the code content split across lines", () => {
    const code = "const a = 1;\nconst b = 2;";
    const { container } = render(<CodeBlock code={code} language="typescript" />);
    const lines = container.querySelectorAll(".oga-code-block__line");
    expect(lines).toHaveLength(2);
  });

  it("renders line numbers zero-padded to 2 digits", () => {
    const code = "a\nb\nc";
    const { container } = render(<CodeBlock code={code} language="bash" />);
    const nums = container.querySelectorAll(".oga-code-block__num");
    expect(nums).toHaveLength(3);
    expect(nums[0]).toHaveTextContent("01");
    expect(nums[1]).toHaveTextContent("02");
    expect(nums[2]).toHaveTextContent("03");
  });

  it("renders a header when one is provided", () => {
    render(
      <CodeBlock
        code="curl https://api.example.com/"
        language="bash"
        header="REQUEST · POST /v1/score"
      />,
    );
    expect(screen.getByText("REQUEST · POST /v1/score")).toBeInTheDocument();
  });

  it("renders the copy button by default", () => {
    render(<CodeBlock code="echo hi" language="bash" />);
    expect(screen.getByRole("button", { name: /Copy code to clipboard/ })).toBeInTheDocument();
  });

  it("does NOT render the copy button when copyable={false}", () => {
    render(<CodeBlock code="echo hi" language="bash" copyable={false} />);
    expect(screen.queryByRole("button", { name: /Copy/ })).not.toBeInTheDocument();
  });

  it("calls navigator.clipboard.writeText with the code when copy clicked", async () => {
    const code = `curl https://api.example.com/v1/score`;
    render(<CodeBlock code={code} language="bash" />);

    const copyBtn = screen.getByRole("button", { name: /Copy code to clipboard/ });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(code);
  });

  it("flips copy button label to 'Copied' after a successful copy", async () => {
    render(<CodeBlock code="echo hi" language="bash" />);

    const copyBtn = screen.getByRole("button", { name: /Copy code to clipboard/ });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(screen.getByRole("button", { name: /Copied to clipboard/ })).toHaveTextContent("Copied");
  });

  it("applies the dark surface variant via data-surface attribute", () => {
    const { container } = render(<CodeBlock code="echo hi" language="bash" surface="dark" />);
    expect(container.querySelector(".oga-code-block")).toHaveAttribute("data-surface", "dark");
  });

  it("highlights HTTP verbs with the canonical .oga-verb--{verb} colour classes", () => {
    const { container } = render(
      <CodeBlock code='curl -X POST "https://api.example.com/"' language="bash" />,
    );
    const postToken = container.querySelector(".oga-verb--post");
    expect(postToken).toHaveTextContent("POST");
    expect(postToken).toHaveClass("oga-verb");
  });

  it("uses different .oga-verb-- classes for GET vs POST (canonical colours)", () => {
    const { container: getC } = render(
      <CodeBlock code='curl -X GET "https://api.example.com/"' language="bash" />,
    );
    expect(getC.querySelector(".oga-verb--get")).toHaveTextContent("GET");
    expect(getC.querySelector(".oga-verb--post")).toBeNull();
  });

  it("highlights JSON keys as key tokens", () => {
    const code = `{
  "engine_version": "2.0.2"
}`;
    const { container } = render(<CodeBlock code={code} language="json" />);
    const keyTokens = container.querySelectorAll(".oga-code-panel__key");
    const keyTexts = Array.from(keyTokens).map((el) => (el.textContent ?? "").trim());
    expect(keyTexts.some((t) => t.includes("engine_version"))).toBe(true);
  });

  it("highlights TypeScript keywords as key tokens", () => {
    const { container } = render(
      <CodeBlock code='const x = "hello";' language="typescript" />,
    );
    const keyTokens = container.querySelectorAll(".oga-code-panel__key");
    const keyTexts = Array.from(keyTokens).map((el) => el.textContent);
    expect(keyTexts).toContain("const");
  });

  it("highlights JSON string values as string tokens", () => {
    const code = `{"key": "value"}`;
    const { container } = render(<CodeBlock code={code} language="json" />);
    const strTokens = container.querySelectorAll(".oga-code-panel__str");
    const strTexts = Array.from(strTokens).map((el) => el.textContent);
    expect(strTexts).toContain('"value"');
  });

  it("highlights numeric values as num-val tokens", () => {
    const code = `{"port": 8080}`;
    const { container } = render(<CodeBlock code={code} language="json" />);
    const numTokens = container.querySelectorAll(".oga-code-panel__num-val");
    const numTexts = Array.from(numTokens).map((el) => el.textContent);
    expect(numTexts).toContain("8080");
  });
});
