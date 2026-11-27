import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Legal.accessibility"))("title") };
}

export default function AccessibilityPage() {
  return <LegalPage namespace="Legal.accessibility" sections={["goal", "verification", "limitations", "contact"]} />;
}
