/**
 * Custom Geist Design System icons that don't have lucide-react equivalents.
 * These are extracted from the original icons.js registry and rendered as React SVG components.
 */

import { cn } from "@/lib/utils";

interface IconProps {
  size?: number;
  className?: string;
}

export function PrismColorIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      className={cn(className)}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ color: "currentColor" }}
      fill="currentColor"
    >
      <path
        d="M9 7L12.5 2.5"
        stroke="var(--color-red-700)"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M10.5 9.5L15.75 10.5"
        stroke="var(--color-blue-700)"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M10 8L15.75 6"
        stroke="var(--color-green-700)"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.14568 3.56625L7 2L7.85432 3.56625L12.1818 11.5L13 13H11.2914H2.70863H1L1.81818 11.5L3.31818 8.75H0V7.25H4.13636L6.14568 3.56625ZM3.52681 11.5L7 5.13249L10.4732 11.5H3.52681Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LoaderCircleIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      className={cn(className)}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ color: "currentColor" }}
      fill="none"
      strokeLinecap="round"
    >
      <path d="M8 0V4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 16V12"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <path
        d="M3.29773 1.52783L5.64887 4.7639"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.9"
      />
      <path
        d="M12.7023 1.52783L10.3511 4.7639"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.1"
      />
      <path
        d="M12.7023 14.472L10.3511 11.236"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <path
        d="M3.29773 14.472L5.64887 11.236"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.6"
      />
      <path
        d="M15.6085 5.52783L11.8043 6.7639"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.2"
      />
      <path
        d="M0.391602 10.472L4.19583 9.23598"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.7"
      />
      <path
        d="M15.6085 10.4722L11.8043 9.2361"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
      />
      <path
        d="M0.391602 5.52783L4.19583 6.7639"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.8"
      />
    </svg>
  );
}
