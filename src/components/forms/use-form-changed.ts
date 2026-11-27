"use client";

import { useEffect, useRef, useState } from "react";

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * ¿Algún campo es distinto de su valor original? Se compara con lo que vino en el HTML (defaultValue,
 * defaultChecked, defaultSelected) y no con una foto tomada al cargar: así cuenta también lo que la
 * persona cambió antes de que la página terminara de cargar.
 */
function differsFromDefaults(form: HTMLFormElement) {
  return [...form.elements].some((element) => {
    const control = element as Control;
    if (!control.name || control.disabled) return false;
    if (control instanceof HTMLSelectElement) return [...control.options].some((option) => option.selected !== option.defaultSelected);
    if (control instanceof HTMLTextAreaElement) return control.value !== control.defaultValue;
    if (!(control instanceof HTMLInputElement)) return false;
    if (control.type === "checkbox" || control.type === "radio") return control.checked !== control.defaultChecked;
    if (control.type === "file") return (control.files?.length ?? 0) > 0;
    if (control.type === "hidden") return false;
    return control.value !== control.defaultValue;
  });
}

/** Los inputs ocultos (listas que arma JavaScript, como los chips) se comparan contra cómo estaban al cargar. */
function hiddenSnapshot(form: HTMLFormElement) {
  return JSON.stringify([...form.querySelectorAll<HTMLInputElement>('input[type="hidden"][name]')].map((input) => [input.name, input.value]));
}

/**
 * ¿Cambió algo en el formulario? Sirve para no dejar "Guardar" activo cuando no hay nada que guardar:
 * evita pisar datos con los mismos valores. Se engancha al botón (button.form). Después de guardar,
 * React vuelve el formulario a los valores guardados (que pasan a ser los originales).
 */
export function useFormChanged(enabled = true) {
  const button = useRef<HTMLButtonElement>(null);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    const form = button.current?.form;
    if (!enabled || !form) return;
    let hiddenBaseline = hiddenSnapshot(form);
    let frame = 0;
    const compute = () => setChanged(differsFromDefaults(form) || hiddenSnapshot(form) !== hiddenBaseline);
    // Algunos controles cambian sin disparar "input": también se revisa después de cada tecla o clic.
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(compute);
    };
    const onReset = () =>
      setTimeout(() => {
        hiddenBaseline = hiddenSnapshot(form);
        compute();
      }, 0);
    check(); // por si algo cambió antes de que cargara el botón
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
