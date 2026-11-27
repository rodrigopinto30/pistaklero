"use client";

import { createContext, type ReactNode, use } from "react";

/** Funciones que dependen de la configuración del servidor (por ejemplo, GIFs con la clave de GIPHY). */
type Features = { gifs: boolean };

const FeaturesContext = createContext<Features>({ gifs: false });

export function FeaturesProvider({ value, children }: { value: Features; children: ReactNode }) {
  return <FeaturesContext value={value}>{children}</FeaturesContext>;
}

export function useFeatures() {
  return use(FeaturesContext);
}
