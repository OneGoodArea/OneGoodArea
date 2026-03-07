import Link from "next/link";

interface LogoProps {
  size?: "sm" | "default" | "lg";
  href?: string;
  variant?: "default" | "footer";
}

export function Logo({ size = "default", href, variant = "default" }: LogoProps) {
  const textSize = size === "sm" ? "text-[11px]" : size === "lg" ? "text-[16px]" : "text-[13px]";

  const isFooter = variant === "footer";
  const textOpacity = isFooter ? "opacity-50" : "";

  const content = (
    <span className={`${textSize} font-semibold tracking-tight ${textOpacity}`}>
      <span style={{ color: "var(--text-primary)" }}>AREA</span>
      <span style={{ color: "var(--neon-green)" }}>IQ</span>
    </span>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
