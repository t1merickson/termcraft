import { Info } from "lucide-react";
import type { ReactNode } from "react";

interface NoteProps {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "min-h-[34px] px-2 py-1.5 text-[13px] leading-[19.5px]",
  md: "min-h-[40px] px-3 py-2 text-sm leading-[21px]",
  lg: "min-h-[48px] px-3 py-[11px] text-base leading-6",
};

export function Note({ children, size = "md" }: NoteProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-sm border border-gray-400 text-gray-900 ${sizeStyles[size]}`}
    >
      <Info className="size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
