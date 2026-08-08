import { ArrowRight, Github } from "lucide-react";
import { Mark } from "@/components/layout/Header";
import { HeroScene } from "./HeroScene";
import { ToolCard } from "./ToolCard";
import { GROUPS, TOOLS, toolsInGroup } from "@/tools/registry";
import { toolHref } from "@/lib/router";
import { REPO_URL, SITE_NAME } from "@/lib/site";

const FACTS = [
  {
    title: "Nothing leaves your machine",
    body: "Every conversion runs in your browser. There is no upload step and no server to upload to — open the network tab and check.",
  },
  {
    title: "No account, no limits",
    body: "No sign-up, no watermark, no export cap, no paid tier. Open a tool and use it.",
  },
  {
    title: "Output you can paste anywhere",
    body: "Plain text, ANSI escape codes, a printf one-liner, PNG, SVG, animated GIF, or an asciinema cast.",
  },
  {
    title: "Open source, MIT",
    body: "Read the renderers, take the parts you want, or run the whole thing yourself. It is a static site with no build secrets.",
  },
];

export function Landing() {
  return (
    <div className="mx-auto max-w-[1180px] px-6">
      <LandingHeader />
      <Hero />
      <Toolbox />
      <Why />
      <Footer />
    </div>
  );
}

function LandingHeader() {
  return (
    <header className="flex h-16 items-center gap-2.5">
      <Mark />
      <span className="text-sm font-semibold text-gray-1000">{SITE_NAME}</span>
      <div className="flex-1" />
      <a
        href="#tools"
        className="rounded-md px-3 py-1.5 text-sm text-gray-900 transition-colors hover:text-gray-1000"
      >
        Tools
      </a>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-gray-900 transition-colors hover:text-gray-1000"
      >
        <Github size={14} />
        GitHub
      </a>
    </header>
  );
}

function Hero() {
  return (
    <section className="grid items-center gap-10 py-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-14 lg:py-20">
      <div>
        <p className="mb-4 inline-flex items-center rounded-full border border-gray-alpha-400 px-3 py-1 font-mono text-xs text-gray-900">
          {TOOLS.length} tools · runs in your browser
        </p>
        <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-gray-1000 sm:text-5xl lg:text-[56px]">
          Everything you can make out of characters.
        </h1>
        <p className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-gray-900">
          Termcraft turns pictures, video, numbers and colour into things a
          terminal can print — ASCII art, braille, block-character images,
          dithered gradients, charts, spinners, progress bars and shell prompts.
          Free, local, and open source.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={toolHref("image-to-ascii")}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-gray-1000 px-4 text-sm font-medium text-background-200 transition-opacity hover:opacity-90"
          >
            Open the toolkit
            <ArrowRight size={15} />
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-alpha-400 px-4 text-sm text-gray-1000 transition-colors hover:bg-gray-alpha-100"
          >
            <Github size={15} />
            Source
          </a>
        </div>
      </div>

      <HeroScene />
    </section>
  );
}

function Toolbox() {
  return (
    <section
      id="tools"
      className="scroll-mt-8 border-t border-gray-alpha-400 py-16"
    >
      <h2 className="text-2xl font-semibold tracking-tight text-gray-1000">
        The toolkit
      </h2>
      <p className="mt-2 max-w-xl text-sm text-gray-900">
        Fourteen tools, grouped by what you are trying to do. Every one opens
        instantly with something already on screen.
      </p>

      <div className="mt-12 space-y-16">
        {GROUPS.map((group) => (
          <div key={group.id}>
            <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-gray-1000">
                {group.label}
              </h3>
              <p className="text-sm text-gray-600">{group.blurb}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {toolsInGroup(group.id).map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Why() {
  return (
    <section className="border-t border-gray-alpha-400 py-16">
      <h2 className="text-2xl font-semibold tracking-tight text-gray-1000">
        How it works
      </h2>
      <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-gray-alpha-400 bg-gray-alpha-400 sm:grid-cols-2">
        {FACTS.map((fact) => (
          <div key={fact.title} className="bg-background-200 p-6">
            <h3 className="text-sm font-semibold text-gray-1000">
              {fact.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-900">
              {fact.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="flex flex-col gap-4 border-t border-gray-alpha-400 py-10 text-sm text-gray-600 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <Mark size={16} />
        <span>{SITE_NAME}</span>
      </div>
      <div className="flex-1" />
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-gray-1000"
        >
          GitHub
        </a>
        <a
          href={`${REPO_URL}/blob/main/LICENSE`}
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-gray-1000"
        >
          MIT licence
        </a>
        <a href="context.md" className="transition-colors hover:text-gray-1000">
          context.md
        </a>
      </div>
    </footer>
  );
}
