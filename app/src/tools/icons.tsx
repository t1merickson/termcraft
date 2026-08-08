import {
  Blend,
  ChartNoAxesColumn,
  ChevronRight,
  Grid2x2,
  Grip,
  Image,
  Loader,
  LoaderCircle,
  Palette,
  PencilLine,
  Search,
  TableProperties,
  Type,
  Video,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Blend,
  ChartNoAxesColumn,
  ChevronRight,
  Grid2x2,
  Grip,
  Image,
  Loader,
  LoaderCircle,
  Palette,
  PencilLine,
  Search,
  TableProperties,
  Type,
  Video,
};

export function ToolIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = ICONS[name] ?? Type;
  return <Icon size={size} />;
}
