import { z } from "zod";

// Se usa igual en el formulario (cliente) y en la Server Action (servidor).
export const magicLinkSchema = z.object({
  email: z.email().max(254),
});
