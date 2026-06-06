// @vitest-environment jsdom

/* AR-239: Component tests for <Tooltip>. Covers acceptance criteria
   from the Jira ticket: shows on focus, hides on blur, Escape
   dismisses, aria-describedby wiring, focus path skips the hover
   delay, mouse path uses the delay. */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Tooltip } from "@/app/design-v2/_shared/dashboard/tooltip";

describe("<Tooltip> (AR-239)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the trigger child but no tooltip panel initially", () => {
    render(
      <Tooltip content="Helpful explanation">
        <button>Trigger</button>
      </Tooltip>,
    );
    expect(screen.getByRole("button", { name: "Trigger" })).toBeInTheDocument();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows the tooltip on focus (no delay path)", () => {
    render(
      <Tooltip content="Helpful explanation">
        <button>Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Trigger" });
    act(() => {
      fireEvent.focus(trigger);
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Helpful explanation");
  });

  it("hides the tooltip on blur", () => {
    render(
      <Tooltip content="Helpful explanation">
        <button>Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Trigger" });
    act(() => {
      fireEvent.focus(trigger);
    });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    act(() => {
      fireEvent.blur(trigger);
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("dismisses the tooltip when Escape is pressed", () => {
    render(
      <Tooltip content="Helpful explanation">
        <button>Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Trigger" });
    act(() => {
      fireEvent.focus(trigger);
    });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(trigger, { key: "Escape" });
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("uses the hover delay before showing on mouse enter", () => {
    render(
      <Tooltip content="Helpful explanation" delay={300}>
        <button>Trigger</button>
      </Tooltip>,
    );
    const wrapper = screen.getByRole("button", { name: "Trigger" }).parentElement!.parentElement!;

    act(() => {
      fireEvent.mouseEnter(wrapper);
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("hides on mouse leave and cancels any pending show timer", () => {
    render(
      <Tooltip content="Helpful explanation" delay={300}>
        <button>Trigger</button>
      </Tooltip>,
    );
    const wrapper = screen.getByRole("button", { name: "Trigger" }).parentElement!.parentElement!;

    act(() => {
      fireEvent.mouseEnter(wrapper);
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    act(() => {
      fireEvent.mouseLeave(wrapper);
    });

    /* After the originally-scheduled show time, the tooltip should
       NOT have appeared because mouse-leave cancelled the timer. */
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("wires aria-describedby from the trigger to the tooltip when open", () => {
    render(
      <Tooltip content="Helpful explanation">
        <button>Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Trigger" });

    act(() => {
      fireEvent.focus(trigger);
    });

    const tooltip = screen.getByRole("tooltip");
    const triggerWrapper = trigger.parentElement!;
    expect(triggerWrapper).toHaveAttribute("aria-describedby", tooltip.id);
    expect(tooltip.id).toMatch(/^tooltip-/);
  });

  it("does NOT have aria-describedby when the tooltip is closed", () => {
    render(
      <Tooltip content="Helpful explanation">
        <button>Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Trigger" });
    const triggerWrapper = trigger.parentElement!;
    expect(triggerWrapper).not.toHaveAttribute("aria-describedby");
  });

  it("applies the light surface variant via data-surface attribute", () => {
    render(
      <Tooltip content="Helpful explanation" surface="light">
        <button>Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Trigger" });
    act(() => {
      fireEvent.focus(trigger);
    });
    expect(screen.getByRole("tooltip")).toHaveAttribute("data-surface", "light");
  });

  it("defaults to dark surface variant", () => {
    render(
      <Tooltip content="Helpful explanation">
        <button>Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Trigger" });
    act(() => {
      fireEvent.focus(trigger);
    });
    expect(screen.getByRole("tooltip")).toHaveAttribute("data-surface", "dark");
  });
});
