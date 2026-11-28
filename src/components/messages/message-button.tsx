import { MessageCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Tip } from "@/components/tip";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

/**
 * "Mensaje": abre la conversación con esa persona (o la arranca). `icon` para tarjetas, `full`
 * para perfiles y ofertas. Va por encima del enlace que cubre una tarjeta (z-10).
 */
export async function MessageButton({ userId, name, variant = "full", className }: { userId: string; name: string; variant?: "icon" | "full"; className?: string }) {
  const t = await getTranslations("Messages.button");
  const href = { pathname: "/messages/new" as const, query: { to: userId } };
  if (variant === "icon") {
    return (
      <Tip label={t("to", { name })}>
        <Link
          href={href}
          aria-label={t("to", { name })}
          className={cn("relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", className)}
        >
          <MessageCircle aria-hidden="true" className="size-5" />
        </Link>
      </Tip>
    );
  }
  return (
    <Link href={href} aria-label={t("to", { name })} className={cn(buttonVariants({ variant: "secondary" }), "relative z-10", className)}>
      <MessageCircle aria-hidden="true" />
      {t("label")}
    </Link>
  );
}
