import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Legal.terms"))("title") };
}

export default function TermsPage() {
  return <LegalPage namespace="Legal.terms" sections={["service", "accounts", "companies", "candidates", "moderation", "liability", "changes"]} />;
}
