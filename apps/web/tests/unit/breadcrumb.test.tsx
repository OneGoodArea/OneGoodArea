// @vitest-environment jsdom

/* AR-243: Component tests for <Breadcrumb>. */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumb } from "@/app/design-v2/_shared/dashboard/breadcrumb";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("<Breadcrumb> (AR-243)", () => {
  it("renders nothing when items is empty", () => {
    const { container } = render(<Breadcrumb items={[]} />);
    expect(container.querySelector(".oga-breadcrumb")).toBeNull();
  });

  it("renders the chain in order", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Org", href: "/dashboard/org" },
          { label: "Members" },
        ]}
      />,
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Org")).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
  });

  it("renders items with href as <a> links", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Org", href: "/dashboard/org" },
          { label: "Members" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Org" })).toHaveAttribute("href", "/dashboard/org");
  });

  it("renders the last item without href as a span with aria-current=page", () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Members" },
        ]}
      />,
    );
    const current = container.querySelector(".oga-breadcrumb__current");
    expect(current?.tagName).toBe("SPAN");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveTextContent("Members");
    expect(screen.queryByRole("link", { name: "Members" })).not.toBeInTheDocument();
  });

  it("treats the last item as current even if it has an href", () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Members", href: "/dashboard/org/members" },
        ]}
      />,
    );
    const current = container.querySelector(".oga-breadcrumb__current");
    expect(current?.tagName).toBe("SPAN");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveTextContent("Members");
    expect(screen.queryByRole("link", { name: "Members" })).not.toBeInTheDocument();
  });

  it("renders the default separator '/' between items", () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: "A", href: "/a" },
          { label: "B" },
        ]}
      />,
    );
    const separators = container.querySelectorAll(".oga-breadcrumb__separator");
    expect(separators.length).toBeGreaterThanOrEqual(1);
    expect(separators[0]).toHaveTextContent("/");
  });

  it("renders a custom separator when provided", () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: "A", href: "/a" },
          { label: "B" },
        ]}
        separator="›"
      />,
    );
    const separators = container.querySelectorAll(".oga-breadcrumb__separator");
    expect(separators[0]).toHaveTextContent("›");
  });

  it("places aria-label='Breadcrumb' on the nav by default", () => {
    render(
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "Members" }]}
      />,
    );
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
  });

  it("uses a custom aria-label when provided", () => {
    render(
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "Members" }]}
        aria-label="Levers navigation"
      />,
    );
    expect(screen.getByRole("navigation", { name: "Levers navigation" })).toBeInTheDocument();
  });

  it("flags item positions via data-position (first / middle / last)", () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Org", href: "/dashboard/org" },
          { label: "Settings", href: "/dashboard/org/settings" },
          { label: "Members" },
        ]}
      />,
    );
    const items = container.querySelectorAll(".oga-breadcrumb__item");
    expect(items[0]).toHaveAttribute("data-position", "first");
    expect(items[1]).toHaveAttribute("data-position", "middle");
    expect(items[2]).toHaveAttribute("data-position", "middle");
    expect(items[3]).toHaveAttribute("data-position", "last");
  });

  it("renders the ellipsis placeholder element only when items.length > 2", () => {
    const { container: small } = render(
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Page" }]} />,
    );
    expect(small.querySelector(".oga-breadcrumb__ellipsis")).toBeNull();

    const { container: long } = render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Org", href: "/dashboard/org" },
          { label: "Members" },
        ]}
      />,
    );
    expect(long.querySelector(".oga-breadcrumb__ellipsis")).not.toBeNull();
  });

  it("does not render a separator after the last item", () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: "A", href: "/a" },
          { label: "B", href: "/b" },
          { label: "C" },
        ]}
      />,
    );
    const lastItem = container.querySelector('.oga-breadcrumb__item[data-position="last"]');
    expect(lastItem?.querySelector(".oga-breadcrumb__separator")).toBeNull();
  });

  it("applies the dark surface variant via data-surface attribute", () => {
    const { container } = render(
      <Breadcrumb
        items={[{ label: "Home", href: "/" }, { label: "Members" }]}
        surface="dark"
      />,
    );
    expect(container.querySelector(".oga-breadcrumb")).toHaveAttribute("data-surface", "dark");
  });

  it("defaults to the light surface", () => {
    const { container } = render(
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "X" }]} />,
    );
    expect(container.querySelector(".oga-breadcrumb")).toHaveAttribute("data-surface", "light");
  });

  it("renders a single-item chain as just the current page", () => {
    const { container } = render(<Breadcrumb items={[{ label: "Dashboard" }]} />);
    const current = container.querySelector(".oga-breadcrumb__current");
    expect(current?.tagName).toBe("SPAN");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveTextContent("Dashboard");
  });

  it("renders an optional icon when provided on an item", () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard", icon: <svg data-testid="dash-icon" /> },
          { label: "Members", icon: <svg data-testid="members-icon" /> },
        ]}
      />,
    );
    expect(screen.getByTestId("dash-icon")).toBeInTheDocument();
    expect(screen.getByTestId("members-icon")).toBeInTheDocument();
    /* Icons render inside an .oga-breadcrumb__icon wrapper with
       aria-hidden so they're decorative-only for screen readers. */
    expect(container.querySelectorAll(".oga-breadcrumb__icon")).toHaveLength(2);
  });

  it("omits the icon slot when no icon is provided", () => {
    const { container } = render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Members" },
        ]}
      />,
    );
    expect(container.querySelector(".oga-breadcrumb__icon")).toBeNull();
  });
});
