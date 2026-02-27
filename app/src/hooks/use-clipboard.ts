import { toast } from "sonner";

export function useClipboard() {
  async function copy(text: string, message = "Copied to clipboard!") {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    toast(message);
  }
  return { copy };
}
