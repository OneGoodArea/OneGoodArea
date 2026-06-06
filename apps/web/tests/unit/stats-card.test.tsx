// @vitest-environment jsdom

/* AR-241: Component tests for <StatsCard>. */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatsCard } from "@/app/design-v2/_shared/dashboard/stats-card";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
    className?: string;
  }) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

describe("<StatsCard> (AR-241)", () => {
  it("renders the label and value", () => {
    render(<StatsCard label="API calls this month" value="12,847" />);
    expect(screen.getByText("API calls this month")).toBeInTheDocument();
    expect(screen.getByText("12,847")).toBeInTheDocument();
  });

  it("renders the hint when provided", () => {
    render(
      <StatsCard label="Plan" value="Starter" hint="of 50,000 included" />,
    );
    expect(screen.getByText("of 50,000 included")).toBeInTheDocument();
  });

  it("renders the delta with the correct trend glyph", () => {
    render(
      <StatsCard
        label="Webhooks delivered"
        value="247"
        delta={{ value: "+8.6%", trend: "up" }}
      />,
    );
    const deltaEl = screen.getByLabelText("Change: +8.6% (up)");
    expect(deltaEl).toHaveTextContent("↑");
    expect(deltaEl).toHaveTextContent("+8.6%");
    expect(deltaEl).toHaveAttribute("data-trend", "up");
  });

  it("renders down trend with the down arrow", () => {
    render(
      <StatsCard
        label="Failures"
        value="12"
        delta={{ value: "-3", trend: "down" }}
      />,
    );
    const deltaEl = screen.getByLabelText("Change: -3 (down)");
    expect(deltaEl).toHaveTextContent("↓");
    expect(deltaEl).toHaveAttribute("data-trend", "down");
  });

  it("renders neutral trend with the right arrow", () => {
    render(
      <StatsCard
        label="Status"
        value="OK"
        delta={{ value: "0", trend: "neutral" }}
      />,
    );
    const deltaEl = screen.getByLabelText("Change: 0 (neutral)");
    expect(deltaEl).toHaveTextContent("→");
    expect(deltaEl).toHaveAttribute("data-trend", "neutral");
  });

  it("renders a progress bar with correct aria attributes", () => {
    render(
      <StatsCard
        label="API calls"
        value="12,847"
        progress={{ current: 12847, max: 50000 }}
      />,
    );
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "50000");
    expect(bar).toHaveAttribute("aria-valuenow", "12847");
  });

  it("computes progress fill width from current/max", () => {
    const { container } = render(
      <StatsCard
        label="Quota"
        value="50"
        progress={{ current: 50, max: 200 }}
      />,
    );
    const fill = container.querySelector(".oga-stats-card__progress-fill") as HTMLElement;
    expect(fill).not.toBeNull();
    expect(fill!.style.getPropertyValue("--oga-stats-card-pct")).toBe("25%");
  });

  it("caps progress fill at 100% when current > max", () => {
    const { container } = render(
      <StatsCard
        label="Quota"
        value="120"
        progress={{ current: 120, max: 100 }}
      />,
    );
    const fill = container.querySelector(".oga-stats-card__progress-fill") as HTMLElement;
    expect(fill!.style.getPropertyValue("--oga-stats-card-pct")).toBe("100%");
  });

  it("floors progress fill at 0% when current < 0", () => {
    const { container } = render(
      <StatsCard
        label="Quota"
        value="0"
        progress={{ current: -50, max: 100 }}
      />,
    );
    const fill = container.querySelector(".oga-stats-card__progress-fill") as HTMLElement;
    expect(fill!.style.getPropertyValue("--oga-stats-card-pct")).toBe("0%");
  });

  it("renders the action as a Link when href is provided", () => {
    render(
      <StatsCard
        label="Plan"
        value="Starter"
        action={{ label: "Upgrade", href: "/dashboard/billing" }}
      />,
    );
    expect(screen.getByRole("link", { name: /Upgrade/ })).toHaveAttribute(
      "href",
      "/dashboard/billing",
    );
  });

  it("renders the action as a button when only onClick is provided", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <StatsCard
        label="Plan"
        value="Starter"
        action={{ label: "Upgrade", onClick }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Upgrade/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies the accent via data-accent attribute", () => {
    const { container } = render(
      <StatsCard label="Quota" value="48k" accent="moderate" />,
    );
    expect(container.querySelector(".oga-stats-card")).toHaveAttribute("data-accent", "moderate");
  });

  it("defaults accent to 'strong' when omitted", () => {
    const { container } = render(<StatsCard label="X" value="1" />);
    expect(container.querySelector(".oga-stats-card")).toHaveAttribute("data-accent", "strong");
  });

  it("applies the dark surface variant via data-surface attribute", () => {
    const { container } = render(
      <StatsCard label="X" value="1" surface="dark" />,
    );
    expect(container.querySelector(".oga-stats-card")).toHaveAttribute("data-surface", "dark");
  });

  it("does not render an action row when no action is provided", () => {
    const { container } = render(<StatsCard label="X" value="1" />);
    expect(container.querySelector(".oga-stats-card__action-row")).toBeNull();
  });

  it("does not render a progress bar when progress is not provided", () => {
    render(<StatsCard label="X" value="1" />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
