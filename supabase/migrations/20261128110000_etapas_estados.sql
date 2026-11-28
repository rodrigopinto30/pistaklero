-- Etapas nuevas de una postulación: "Vista" (la empresa la abrió) y "Preseleccionada".
-- Van en su propia migración: un valor nuevo de un enum no se puede usar en la misma transacción.
alter type public.application_status add value if not exists 'viewed' after 'received';
alter type public.application_status add value if not exists 'shortlisted' after 'in_review';
