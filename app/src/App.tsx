import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar, type TabId } from "@/components/layout/Sidebar";
import { TabContent } from "@/components/layout/TabContent";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>("wheel");

  return (
    <TooltipProvider>
      <div className="mx-auto flex min-h-screen max-w-[1220px] flex-col border-x border-gray-alpha-400">
        <Header />
        <div className="flex flex-1">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <TabContent activeTab={activeTab} />
        </div>

      </div>
      <Toaster position="bottom-center" />
    </TooltipProvider>
  );
}
