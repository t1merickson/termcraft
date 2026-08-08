import { ArrowUpRight } from "lucide-react";
import type { Tool } from "@/tools/registry";
import { ToolIcon } from "@/tools/icons";
import { toolHref } from "@/lib/router";

export function ToolCard({ tool }: { tool: Tool }) {
  return (
    <a
      href={toolHref(tool.id)}
      className="group flex flex-col overflow-hidden rounded-lg border border-gray-alpha-400 bg-background-200 transition-colors hover:border-gray-alpha-500 focus-visible:shadow-focus-ring focus-visible:outline-none"
    >
      <div className="relative flex h-[140px] items-center justify-center overflow-hidden border-b border-gray-alpha-400 bg-background-100">
        <pre
          aria-hidden="true"
          className="m-0 select-none whitespace-pre font-mono text-[11px] leading-[1.15] text-gray-700 transition-colors group-hover:text-gray-900"
        >
          {tool.preview.join("\n")}
        </pre>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--color-background-100)_100%)]" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <span className="flex size-4 shrink-0 items-center justify-center text-gray-900">
            <ToolIcon name={tool.icon} size={15} />
          </span>
          <h4 className="text-sm font-semibold text-gray-1000">{tool.name}</h4>
          <ArrowUpRight
            size={14}
            className="ml-auto text-gray-600 opacity-0 transition-opacity group-hover:opacity-100"
          />
        </div>

        <p className="mt-1.5 text-sm text-gray-900">{tool.tagline}</p>

        <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
          {tool.description}
        </p>

        <ul className="mt-4 space-y-1.5 border-t border-gray-alpha-400 pt-4">
          {tool.features.map((feature) => (
            <li
              key={feature}
              className="flex gap-2 text-[13px] leading-snug text-gray-900"
            >
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-gray-500" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </a>
  );
}
