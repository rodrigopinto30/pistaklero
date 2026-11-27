"use client";

import { Menu } from "@base-ui/react/menu";
import { Bookmark, Briefcase, Building2, ChevronDown, FileText, Languages, LayoutDashboard, LogOut, PenLine, Settings, Shield, UserRound, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type ComponentProps, useRef } from "react";
import { signOut } from "@/lib/auth/actions";
import { initialsOf } from "@/components/avatar";
import { Link, usePathname } from "@/i18n/navigation";
import { type AppLocale, routing } from "@/i18n/routing";
import { Emoji } from "@/components/emoji";

const ICONS = { profile: UserRound, applications: Briefcase, saved: Bookmark, posts: PenLine, dashboard: LayoutDashboard, company: Building2, team: Users, admin: Shield, import: FileText, settings: Settings } as const;

export type MenuEntry = { href: ComponentProps<typeof Link>["href"]; label: string; icon: keyof typeof ICONS };

const LOCALE_LABELS: Record<AppLocale, { short: string; name: string }> = {
  es: { short: "ESP", name: "Español" },
  en: { short: "ENG", name: "English" },
};

const itemClass =
  "flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm outline-none select-none data-highlighted:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground";

/**
 * Menú de la cuenta: la foto, el nombre y el email; al abrirlo, los accesos de cada rol,
 * los ajustes, el idioma y salir. Teclado completo (flechas, Esc) gracias a Base UI.
 */
export function UserMenu({ name, email, photo, entries }: { name: string; email: string; photo: string | null; entries: MenuEntry[] }) {
  const t = useTranslations("Header");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const params = useParams();
  const signOutForm = useRef<HTMLFormElement>(null);
  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  return (
    <>
      {/* Salir es una acción del servidor: el ítem del menú envía este formulario. */}
      <form ref={signOutForm} action={signOut} hidden>
        <input type="hidden" name="locale" value={locale} />
      </form>
      <Menu.Root>
        <Menu.Trigger className="flex items-center gap-2.5 rounded-full bg-card p-1 shadow-soft transition-shadow hover:shadow-soft-lg data-popup-open:shadow-soft-lg lg:pr-3">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- WebP de 256 px ya optimizado, desde nuestro Storage.
            <img src={photo} alt="" width={36} height={36} className="size-9 rounded-full object-cover" />
          ) : (
            <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
              {initialsOf(name || email)}
            </span>
          )}
          <span className="sr-only">{t("accountMenu")}: </span>
          <span className="sr-only flex-col text-left lg:not-sr-only lg:flex">
            <span className="max-w-44 truncate text-sm leading-tight font-medium">{name || email}</span>
            {name && <span className="max-w-44 truncate text-xs leading-tight text-muted-foreground">{email}</span>}
          </span>
          <ChevronDown aria-hidden="true" className="hidden size-4 text-muted-foreground lg:block" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={8} align="end" className="z-50 outline-none">
            <Menu.Popup className="w-72 origin-[var(--transform-origin)] rounded-2xl bg-popover p-2 text-popover-foreground shadow-soft-lg outline-none transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
              <div className="flex flex-col px-3 py-2 lg:hidden">
                <span className="truncate text-sm font-medium">{name || email}</span>
                {name && <span className="truncate text-xs text-muted-foreground">{email}</span>}
              </div>
              {entries.map((entry) => {
                const Icon = ICONS[entry.icon];
                return (
                  <Menu.LinkItem key={entry.label} closeOnClick render={<Link href={entry.href} />} className={itemClass}>
                    <Icon aria-hidden="true" />
                    {entry.label}
                  </Menu.LinkItem>
                );
              })}
              <Menu.Separator className="mx-2 my-1.5 h-px bg-border" />
              <Menu.LinkItem
                closeOnClick
                // @ts-expect-error -- pathname y params vienen de la ruta actual, así que siempre coinciden.
                render={<Link href={{ pathname, params }} locale={other} lang={other} hrefLang={other} />}
                aria-label={`${LOCALE_LABELS[other].short} – ${LOCALE_LABELS[other].name}`}
                className={itemClass}
              >
                <Languages aria-hidden="true" />
                <span>
                  {LOCALE_LABELS[other].short} – {LOCALE_LABELS[other].name}
                </span>
              </Menu.LinkItem>
              <Menu.Separator className="mx-2 my-1.5 h-px bg-border" />
              <Menu.Item onClick={() => signOutForm.current?.requestSubmit()} className={itemClass}>
                <LogOut aria-hidden="true" />
                {t("signOut")}
                <Emoji symbol="👋" />
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </>
  );
}
