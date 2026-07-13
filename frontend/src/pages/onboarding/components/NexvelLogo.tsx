import { cn } from "../../../lib/utils";

/** Wordmark NEXVEL (logo oficial). Passe a altura via className (ex.: `h-8`). */
export function NexvelLogo({ className = "" }: { className?: string }) {
  return (
    <img
      src="/nexvel-wordmark.png"
      alt="Nexvel"
      className={cn("block w-auto select-none", className)}
    />
  );
}
