import { Check, CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Hasta dónde llegaron y se leyeron mis mensajes (de la otra persona): ver conversation_receipts. */
export type Receipts = { delivered_at: string | null; read_at: string | null } | null;
export type MessageStatus = "sent" | "delivered" | "read";

/** El estado de un mensaje mío según cuándo se mandó y hasta dónde llegó la otra persona. */
export function statusOf(createdAt: string, receipts: Receipts): MessageStatus {
  const at = new Date(createdAt).getTime();
  if (receipts?.read_at && new Date(receipts.read_at).getTime() >= at) return "read";
  if (receipts?.delivered_at && new Date(receipts.delivered_at).getTime() >= at) return "delivered";
  return "sent";
}

/**
 * Las tildes, como en las mensajerías: ✓ enviado, ✓✓ entregado y ✓✓ en azul leído. Los lectores de
 * pantalla oyen el estado; con `label` también se ve escrito (el color no es la única pista,
 * WCAG 1.4.1: se muestra en el último mensaje, que vale para todos los anteriores).
 */
export function MessageTicks({ status, label = false, className }: { status: MessageStatus; label?: boolean; className?: string }) {
  const t = useTranslations("Messages.status");
  const Icon = status === "sent" ? Check : CheckCheck;
  return (
    <span data-status={status} className={cn("inline-flex shrink-0 items-center gap-1", status === "read" ? "text-(--text-blue)" : "text-muted-foreground", className)}>
      <Icon aria-hidden="true" className="size-4" />
      <span className={label ? undefined : "sr-only"}>{t(status)}</span>
    </span>
  );
}
