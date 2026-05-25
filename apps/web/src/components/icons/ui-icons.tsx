/* Tiny inline SVG icons for non-brand UI primitives (close, play, spinner,
   caret, tick). Replaces the lucide-react dependency for the two live files
   that needed it. Brand iconography goes through AiqIcon in design-v2;
   these are pure UI utility shapes (X, Play, Check, etc.).

   API matches lucide-react: size, className, style, color all supported. */

import type { CSSProperties } from "react";

interface IconProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
  color?: string;
}

function svgProps({ size = 24, className, style, color }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: color ?? "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    style,
    "aria-hidden": true,
  };
}

export function X(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function Play(props: IconProps) {
  return (
    <svg {...svgProps(props)} fill={props.color ?? "currentColor"} stroke="none">
      <polygon points="6,4 20,12 6,20" />
    </svg>
  );
}

export function Check(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function Loader2(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
