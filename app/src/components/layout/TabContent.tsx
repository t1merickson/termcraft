import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TabId } from "./Sidebar";

// React tab components
import { LookupTab } from "@/tabs/LookupTab";
import { ColorWheelTab } from "@/tabs/ColorWheelTab";
import { SpinnersTab } from "@/tabs/SpinnersTab";
import { PixelFontTab } from "@/tabs/PixelFontTab";
import { ImageToAnsiTab } from "@/tabs/ImageToAnsiTab";
import { ImageToAsciiTab } from "@/tabs/ImageToAsciiTab";
import { AsciiEditorTab } from "@/tabs/AsciiEditorTab";
import { VideoToAsciiTab } from "@/tabs/VideoToAsciiTab";

const tabs: Record<TabId, () => ReactNode> = {
  wheel: () => <ColorWheelTab />,
  lookup: () => <LookupTab />,
  image: () => <ImageToAnsiTab />,
  ascii: () => <ImageToAsciiTab />,
  editor: () => <AsciiEditorTab />,
  video: () => <VideoToAsciiTab />,
  font: () => <PixelFontTab />,
  spinners: () => <SpinnersTab />,
};

const allTabIds: TabId[] = [
  "wheel",
  "lookup",
  "image",
  "ascii",
  "editor",
  "video",
  "font",
  "spinners",
];

interface TabContentProps {
  activeTab: TabId;
}

export function TabContent({ activeTab }: TabContentProps) {
  // Track which tabs have been visited (mount on first visit, keep mounted)
  const [visited, setVisited] = useState<Set<TabId>>(
    () => new Set([activeTab]),
  );

  useEffect(() => {
    setVisited((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  return (
    <main
      className="flex-1 overflow-y-auto px-12 py-10"
      style={{ maxWidth: 960 }}
    >
      {allTabIds.map((tabId) => {
        if (!visited.has(tabId)) return null;
        const isActive = activeTab === tabId;
        const renderTab = tabs[tabId];

        return (
          <div
            key={tabId}
            style={{ display: isActive ? "block" : "none" }}
          >
            {renderTab()}
          </div>
        );
      })}
    </main>
  );
}
