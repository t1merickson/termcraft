import { Github } from "lucide-react";
import { HOME_HREF } from "@/lib/router";
import { REPO_URL } from "@/lib/site";

export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="shrink-0 text-gray-1000"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect width="20" height="20" rx="4" fill="currentColor" />
      <rect x="3" y="3" width="6" height="6" rx="1" fill="#0a0a0a" />
      <rect x="11" y="3" width="6" height="6" rx="1" fill="#0a0a0a" />
      <rect x="3" y="11" width="6" height="6" rx="1" fill="#0a0a0a" />
      <rect x="11" y="11" width="6" height="6" rx="1" fill="#0a0a0a" opacity="0.4" />
    </svg>
  );
}

export function Header({ subtitle }: { subtitle?: string }) {
  return (
    <header className="sticky top-0 z-100 h-16 shrink-0 border-b border-gray-alpha-400 bg-background-200/80 backdrop-blur-xl">
      <div className="flex h-full items-center gap-3 px-6">
        <a
          href={HOME_HREF}
          className="flex items-center gap-2.5 rounded-sm outline-none focus-visible:shadow-focus-ring"
        >
          <Mark />
          <span className="text-sm font-semibold text-gray-1000">Termcraft</span>
        </a>
        {subtitle && (
          <>
            <span className="text-xl font-light text-gray-500">/</span>
            <span className="text-sm text-gray-900">{subtitle}</span>
          </>
        )}
        <div className="flex-1" />
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="flex size-8 items-center justify-center rounded-md text-gray-900 transition-colors hover:bg-gray-alpha-100 hover:text-gray-1000"
          aria-label="Source on GitHub"
        >
          <Github size={16} />
        </a>
      </div>
    </header>
  );
}
