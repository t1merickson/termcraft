import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useRoute } from "@/lib/router";
import { Landing } from "@/landing/Landing";
import { Workbench } from "@/components/layout/Workbench";

export function App() {
  const route = useRoute();

  return (
    <TooltipProvider>
      {route.name === "home" ? (
        <Landing />
      ) : (
        <Workbench tool={route.tool} params={route.params} />
      )}
      <Toaster position="bottom-center" />
    </TooltipProvider>
  );
}
