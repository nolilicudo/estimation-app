/**
 * InfoTooltip — a small "?" icon that shows a description tooltip on hover/focus.
 * Usage:
 *   <InfoTooltip description="What this option includes..." />
 *
 * Renders nothing when description is empty/null/undefined.
 */
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface InfoTooltipProps {
  description?: string | null;
  /** Maximum width of the tooltip bubble. Defaults to "max-w-xs". */
  maxWidth?: string;
}

export function InfoTooltip({ description, maxWidth = "max-w-xs" }: InfoTooltipProps) {
  if (!description) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground/60 hover:text-canyon transition-colors cursor-help shrink-0"
          aria-label="More information"
        >
          <Info className="w-3.5 h-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className={`${maxWidth} text-xs leading-relaxed whitespace-normal text-left font-body`}
      >
        {description}
      </TooltipContent>
    </Tooltip>
  );
}
