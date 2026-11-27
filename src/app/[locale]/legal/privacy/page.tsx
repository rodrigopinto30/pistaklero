import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Legal.privacy"))("title") };
}

export default function PrivacyPage() {
  return <LegalPage namespace="Legal.privacy" sections={["data", "purpose", "visibility", "cookies", "providers", "rights", "retention"]} />;
}
