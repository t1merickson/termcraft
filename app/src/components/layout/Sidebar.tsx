import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { GROUPS, TOOLS, type ToolId } from "@/tools/registry";
import { ToolIcon } from "@/tools/icons";
import { HOME_HREF, toolHref } from "@/lib/router";

export function Sidebar({ activeTool }: { activeTool: ToolId }) {
  return (
    <nav className="sticky top-16 z-100 hidden h-[calc(100vh-64px)] w-[240px] shrink-0 flex-col overflow-y-auto border-r border-gray-alpha-400 bg-background-200 pb-8 md:flex">
      <a
        href={HOME_HREF}
        className="mx-3 mt-3 flex h-9 items-center gap-2 rounded-md px-3 text-sm text-gray-900 transition-colors hover:bg-gray-alpha-100 hover:text-gray-1000"
      >
        <ArrowLeft size={14} />
        All tools
      </a>

      {GROUPS.map((group) => (
        <div key={group.id} className="mt-3">
          <div className="px-6 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
            {group.label}
          </div>
          {TOOLS.filter((t) => t.group === group.id).map((tool) => (
            <a
              key={tool.id}
              href={toolHref(tool.id)}
              className={cn(
                "mx-3 flex h-9 items-center gap-2.5 rounded-md px-3 text-sm text-gray-900 transition-colors hover:bg-gray-alpha-100 hover:text-gray-1000",
                activeTool === tool.id && "bg-gray-alpha-100 text-gray-1000",
              )}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                <ToolIcon name={tool.icon} size={15} />
              </span>
              <span className="truncate">{tool.name}</span>
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}
