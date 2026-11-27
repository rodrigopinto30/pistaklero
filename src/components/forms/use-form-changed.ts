"use client";

import { useEffect, useRef, useState } from "react";

/** Foto de los valores del formulario (los archivos, por nombre y tamaño). */
function snapshot(form: HTMLFormElement) {
  return JSON.stringify([...new FormData(form)].map(([name, value]) => [name, typeof value === "string" ? value : `${value.name}:${value.size}`]));
}

/**
 * ¿Cambió algo en el formulario desde que se cargó (o desde el último guardado)? Sirve para no
 * dejar "Guardar" activo cuando no hay nada que guardar: evita pisar datos con los mismos valores.
 * Se engancha al botón (button.form) y escucha los eventos del formulario; después de cada envío
 * React vuelve el formulario a sus valores guardados y la foto de referencia se renueva.
 */
export function useFormChanged(enabled = true) {
  const button = useRef<HTMLButtonElement>(null);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    const form = button.current?.form;
    if (!enabled || !form) return;
    let baseline = snapshot(form);
    let frame = 0;
    // Algunos controles (selectores propios) cambian inputs ocultos sin disparar "input": por eso
    // también se revisa después de cada tecla o clic, una vez por cuadro.
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setChanged(snapshot(form) !== baseline));
    };
    const onReset = () =>
      setTimeout(() => {
        baseline = snapshot(form);
        setChanged(false);
      }, 0);
    const events = ["input", "change", "keyup", "pointerup"] as const;
    events.forEach((type) => form.addEventListener(type, check));
    form.addEventListener("reset", onReset);
    return () => {
      cancelAnimationFrame(frame);
      events.forEach((type) => form.removeEventListener(type, check));
      form.removeEventListener("reset", onReset);
    };
  }, [enabled]);

  return { button, changed: !enabled || changed };
}
