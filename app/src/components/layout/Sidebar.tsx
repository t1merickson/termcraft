import {
  Search,
  Image,
  Type,
  PencilLine,
  Video,
  Grid2x2,
} from "lucide-react";
import { PrismColorIcon, LoaderCircleIcon } from "@/components/icons/geist-icons";
import { cn } from "@/lib/utils";

export type TabId =
  | "wheel"
  | "lookup"
  | "image"
  | "ascii"
  | "editor"
  | "video"
  | "font"
  | "spinners";

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: "wheel", label: "Color Wheel", icon: <PrismColorIcon size={16} /> },
  { id: "lookup", label: "Lookup & Convert", icon: <Search size={16} /> },
  { id: "image", label: "Image to ANSI", icon: <Image size={16} /> },
  { id: "ascii", label: "Image to ASCII", icon: <Type size={16} /> },
  { id: "editor", label: "ASCII Editor", icon: <PencilLine size={16} /> },
  { id: "video", label: "Video to ASCII", icon: <Video size={16} /> },
  { id: "font", label: "Pixel Font", icon: <Grid2x2 size={16} /> },
  { id: "spinners", label: "CLI Spinners", icon: <LoaderCircleIcon size={16} /> },
];

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="sticky top-16 z-100 flex h-[calc(100vh-64px)] w-[260px] shrink-0 flex-col overflow-y-auto border-r border-gray-alpha-400 bg-background-200">
      <nav className="flex-1 py-2">
        <div className="px-5 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-gray-600">
          Tools
        </div>
        {navItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "relative mx-3 flex h-10 cursor-pointer items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-gray-900 transition-colors hover:bg-gray-100",
              activeTab === item.id && "bg-gray-alpha-100 text-gray-1000",
            )}
            onClick={() => onTabChange(item.id)}
          >
            <span className="size-4 shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
