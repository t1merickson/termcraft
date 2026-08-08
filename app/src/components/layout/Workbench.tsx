import { useEffect, useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { TAB_COMPONENTS } from "@/tools/tabs";
import { TOOLS_BY_ID, type ToolId } from "@/tools/registry";

interface WorkbenchProps {
  tool: ToolId;
  params: URLSearchParams;
}

export function Workbench({ tool }: WorkbenchProps) {
  // Tabs mount on first visit and stay mounted, so switching away and back
  // keeps an in-progress conversion, drawing, or webcam stream alive.
  const [visited, setVisited] = useState<Set<ToolId>>(() => new Set([tool]));

  useEffect(() => {
    setVisited((prev) => {
      if (prev.has(tool)) return prev;
      const next = new Set(prev);
      next.add(tool);
      return next;
    });
  }, [tool]);

  const active = TOOLS_BY_ID[tool];

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col border-x border-gray-alpha-400">
      <Header subtitle={active?.name} />
      <div className="flex flex-1">
        <Sidebar activeTool={tool} />
        <main className="min-w-0 flex-1 px-8 py-10 lg:px-12">
          <div className="mb-8 border-b border-gray-alpha-400 pb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-1000">
              {active?.name}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-gray-900">
              {active?.tagline}
            </p>
          </div>

          {Array.from(visited).map((id) => {
            const Tab = TAB_COMPONENTS[id];
            return (
              <div key={id} style={{ display: id === tool ? "block" : "none" }}>
                <Tab />
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
}
