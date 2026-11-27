import * as React from "react";
import { cn } from "@/lib/utils";

// Mismo estilo que Input: borde de 3:1 de contraste y foco con el outline global.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-24 w-full rounded-lg border border-input bg-input/30 px-3 py-2 text-base placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
