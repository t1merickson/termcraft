/**
 * Maps every tool id in the registry to the component that renders it.
 * Kept separate from `registry.ts` so the registry stays plain data that the
 * landing page can import without pulling in every tool's code.
 */

import type { ComponentType } from "react";
import type { ToolId } from "./registry";

import { ColorWheelTab } from "@/tabs/ColorWheelTab";
import { LookupTab } from "@/tabs/LookupTab";
import { ImageToAnsiTab } from "@/tabs/ImageToAnsiTab";
import { ImageToAsciiTab } from "@/tabs/ImageToAsciiTab";
import { AsciiEditorTab } from "@/tabs/AsciiEditorTab";
import { VideoToAsciiTab } from "@/tabs/VideoToAsciiTab";
import { PixelFontTab } from "@/tabs/PixelFontTab";
import { SpinnersTab } from "@/tabs/SpinnersTab";
import { DitherTab } from "@/tabs/DitherTab";
import { ProgressTab } from "@/tabs/ProgressTab";
import { BoxesTab } from "@/tabs/BoxesTab";
import { PromptTab } from "@/tabs/PromptTab";
import { ChartsTab } from "@/tabs/ChartsTab";
import { GradientsTab } from "@/tabs/GradientsTab";

export const TAB_COMPONENTS: Record<ToolId, ComponentType> = {
  "color-wheel": ColorWheelTab,
  lookup: LookupTab,
  "image-to-ansi": ImageToAnsiTab,
  "image-to-ascii": ImageToAsciiTab,
  editor: AsciiEditorTab,
  video: VideoToAsciiTab,
  "pixel-font": PixelFontTab,
  spinners: SpinnersTab,
  dither: DitherTab,
  progress: ProgressTab,
  boxes: BoxesTab,
  prompt: PromptTab,
  charts: ChartsTab,
  gradients: GradientsTab,
};
