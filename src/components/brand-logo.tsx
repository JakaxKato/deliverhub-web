import { cn } from "../lib/cn";

// NodeWave waveform mark — stylized signal bars, the brand's visual anchor.
export function BrandLogo({
  className,
  iconSize = "md",
}: {
  className?: string;
  iconSize?: "md" | "lg";
}) {
  const bar = iconSize === "lg" ? "w-[7px]" : "w-[5px]";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "rounded-xl bg-gradient-to-tr from-deep to-primary flex items-center justify-center gap-[2px] shadow-glow",
          iconSize === "lg" ? "w-11 h-11 px-2.5" : "w-8 h-8 px-2",
        )}
        aria-hidden="true"
      >
        <span className={`${bar} h-2.5 bg-primary-tint rounded-full`} />
        <span className={`${bar} h-4 bg-white/90 rounded-full`} />
        <span className={`${bar} h-2 bg-primary-tint/70 rounded-full`} />
      </div>
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            "font-extrabold tracking-tight text-foreground",
            iconSize === "lg" ? "text-xl" : "text-sm",
          )}
        >
          Node<span className="text-primary">Wave</span>
        </span>
        <span className="text-[10px] font-mono text-faint uppercase tracking-[0.14em]">
          Deliverable OS
        </span>
      </span>
    </div>
  );
}
