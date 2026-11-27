import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";

export async function SignOutButton() {
  const t = await getTranslations("Auth");
  const locale = await getLocale();

  return (
    <form action={signOut}>
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" variant="ghost">
        {t("signOut")}
      </Button>
    </form>
  );
}
