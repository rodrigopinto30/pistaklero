"use client";

import { useEffect, useRef, useState } from "react";

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Los saltos de línea se comparan sin \r: lo guardado desde un <textarea> viaja con \r\n (así envía
 * el navegador) y su valor en pantalla usa \n. Si no, un texto de varias líneas siempre "cambiaba".
 */
const sameText = (a: string, b: string) => a.replace(/\r\n?/g, "\n") === b.replace(/\r\n?/g, "\n");

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
    if (control instanceof HTMLTextAreaElement) return !sameText(control.value, control.defaultValue);
    if (!(control instanceof HTMLInputElement)) return false;
    if (control.type === "checkbox" || control.type === "radio") return control.checked !== control.defaultChecked;
    if (control.type === "file") return (control.files?.length ?? 0) > 0;
    if (control.type === "hidden") return false;
    return control.value !== control.defaultValue;
  });
}

/**
 * Foto de todos los valores, para comparar contra cómo estaba al cargar. Cubre lo que la comparación
 * con el HTML no ve: los inputs ocultos (listas que arma JavaScript, como los chips) y los campos
 * controlados por React (React copia su valor en el original a cada tecla, como en las contraseñas).
 */
function snapshot(form: HTMLFormElement) {
  return JSON.stringify(
    [...form.elements].map((element) => {
      const control = element as Control;
      if (!control.name || control.disabled || (control instanceof HTMLInputElement && control.type === "file")) return null;
      if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) return [control.name, control.checked];
      return [control.name, control.value.replace(/\r\n?/g, "\n")];
    })
  );
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
    let baseline = snapshot(form);
    let frame = 0;
    const compute = () => setChanged(differsFromDefaults(form) || snapshot(form) !== baseline);
    // Algunos controles cambian sin disparar "input": también se revisa después de cada tecla o clic.
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(compute);
    };
    const onReset = () =>
      setTimeout(() => {
        baseline = snapshot(form);
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
