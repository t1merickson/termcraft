export function Header() {
  return (
    <header className="sticky top-0 z-100 h-16 shrink-0 border-b border-gray-alpha-400 bg-background-200/80 backdrop-blur-xl">
      <div className="flex h-full items-center px-6">
        <div className="flex items-center gap-2.5">
          <svg
            className="text-gray-1000 shrink-0"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <rect width="20" height="20" rx="4" fill="currentColor" />
            <rect x="3" y="3" width="6" height="6" rx="1" fill="#0a0a0a" />
            <rect x="11" y="3" width="6" height="6" rx="1" fill="#0a0a0a" />
            <rect x="3" y="11" width="6" height="6" rx="1" fill="#0a0a0a" />
            <rect
              x="11"
              y="11"
              width="6"
              height="6"
              rx="1"
              fill="#0a0a0a"
              opacity="0.4"
            />
          </svg>
          <span className="text-sm font-semibold text-gray-1000">
            Termcraft
          </span>
          <span className="text-xl font-light text-gray-500">/</span>
          <span className="text-sm text-gray-900">Terminal Art Toolkit</span>
        </div>
      </div>
    </header>
  );
}
