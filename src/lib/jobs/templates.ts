/*
 * Plantillas de roles: completan puesto, descripción base, seniority y tecnologías del formulario de ofertas.
 * Son contenido del producto (no datos de usuarios): viven en el código, traducidas, y se revisan en cada PR.
 */
type Seniority = "trainee" | "junior" | "semi_senior" | "senior" | "lead";
type Copy = { title: string; description: string };

export type JobTemplate = {
  slug: string;
  seniority: Seniority;
  /** Slugs de la tabla skills. */
  skills: string[];
  es: Copy;
  en: Copy;
};

export const JOB_TEMPLATES: JobTemplate[] = [
  {
    slug: "frontend-junior",
    seniority: "junior",
    skills: ["javascript", "typescript", "react", "html", "css", "git"],
    es: {
      title: "Desarrollador/a Frontend Junior",
      description: `## Qué vas a hacer

- Construir pantallas con React y TypeScript a partir de diseños en Figma.
- Cuidar la accesibilidad y el rendimiento de lo que publicamos.
- Revisar código con el equipo y aprender en cada revisión.

## Qué buscamos

- Bases sólidas de HTML, CSS y JavaScript.
- Algún proyecto propio o de curso que puedas mostrar.
- Ganas de preguntar y de aprender.

## Qué ofrecemos

- Mentoría de una persona senior.
- Horario flexible.`,
    },
    en: {
      title: "Junior Frontend Developer",
      description: `## What you'll do

- Build screens with React and TypeScript from Figma designs.
- Take care of the accessibility and performance of what we ship.
- Review code with the team and learn from every review.

## What we're looking for

- Solid HTML, CSS and JavaScript fundamentals.
- A personal or course project you can show.
- Willingness to ask questions and learn.

## What we offer

- Mentoring from a senior engineer.
- Flexible hours.`,
    },
  },
  {
    slug: "backend-junior",
    seniority: "junior",
    skills: ["nodejs", "sql", "postgresql", "rest-apis", "git", "docker"],
    es: {
      title: "Desarrollador/a Backend Junior",
      description: `## Qué vas a hacer

- Desarrollar y mantener APIs REST.
- Diseñar consultas y tablas en PostgreSQL.
- Escribir tests y participar de las revisiones de código.

## Qué buscamos

- Conocimientos de algún lenguaje de backend (por ejemplo, Node.js).
- Nociones de SQL y de Git.
- Interés por la seguridad y la calidad del código.

## Qué ofrecemos

- Mentoría y un plan de crecimiento.
- Horario flexible.`,
    },
    en: {
      title: "Junior Backend Developer",
      description: `## What you'll do

- Build and maintain REST APIs.
- Design queries and tables in PostgreSQL.
- Write tests and take part in code reviews.

## What we're looking for

- Knowledge of a backend language (for example, Node.js).
- Basic SQL and Git.
- Interest in security and code quality.

## What we offer

- Mentoring and a growth plan.
- Flexible hours.`,
    },
  },
  {
    slug: "community-manager",
    seniority: "junior",
    skills: ["community-management", "content-marketing", "copywriting", "meta-ads", "canva"],
    es: {
      title: "Community Manager",
      description: `## Qué vas a hacer

- Planificar y publicar contenido en nuestras redes.
- Responder a la comunidad con buena onda y a tiempo.
- Medir resultados y proponer mejoras cada mes.

## Qué buscamos

- Muy buena redacción y ortografía.
- Experiencia gestionando redes (propias o de terceros).
- Manejo de herramientas de diseño simples, como Canva.

## Qué ofrecemos

- Libertad creativa.
- Capacitaciones en marketing digital.`,
    },
    en: {
      title: "Community Manager",
      description: `## What you'll do

- Plan and publish content on our social channels.
- Reply to the community in a friendly and timely way.
- Track results and suggest improvements every month.

## What we're looking for

- Great writing skills.
- Experience managing social media (your own or for others).
- Familiarity with simple design tools such as Canva.

## What we offer

- Creative freedom.
- Digital marketing training.`,
    },
  },
  {
    slug: "ux-ui",
    seniority: "junior",
    skills: ["figma", "ui-design", "ux-research", "prototyping", "design-systems", "web-accessibility"],
    es: {
      title: "Diseñador/a UX/UI",
      description: `## Qué vas a hacer

- Diseñar flujos e interfaces en Figma, del boceto al prototipo.
- Hablar con usuarias y usuarios para entender sus problemas.
- Mantener y hacer crecer nuestro sistema de diseño.

## Qué buscamos

- Un portfolio con casos donde se vea tu proceso.
- Manejo de Figma.
- Criterio de accesibilidad (contraste, jerarquía, foco).

## Qué ofrecemos

- Un equipo que valora la investigación.
- Horario flexible.`,
    },
    en: {
      title: "UX/UI Designer",
      description: `## What you'll do

- Design flows and interfaces in Figma, from sketch to prototype.
- Talk to users to understand their problems.
- Maintain and grow our design system.

## What we're looking for

- A portfolio with case studies that show your process.
- Figma skills.
- An eye for accessibility (contrast, hierarchy, focus).

## What we offer

- A team that values research.
- Flexible hours.`,
    },
  },
  {
    slug: "sdr",
    seniority: "junior",
    skills: ["sales-prospecting", "hubspot", "salesforce", "communication", "english"],
    es: {
      title: "SDR (Sales Development Representative)",
      description: `## Qué vas a hacer

- Buscar y contactar empresas que puedan necesitar nuestro producto.
- Calificar oportunidades y agendar reuniones para el equipo comercial.
- Mantener el CRM al día.

## Qué buscamos

- Muy buena comunicación oral y escrita.
- Inglés intermedio o avanzado.
- Constancia y organización.

## Qué ofrecemos

- Sueldo fijo más comisiones.
- Plan de carrera hacia Account Executive.`,
    },
    en: {
      title: "SDR (Sales Development Representative)",
      description: `## What you'll do

- Find and reach out to companies that may need our product.
- Qualify opportunities and book meetings for the sales team.
- Keep the CRM up to date.

## What we're looking for

- Great spoken and written communication.
- Intermediate or advanced English.
- Persistence and organization.

## What we offer

- Base salary plus commissions.
- A career path to Account Executive.`,
    },
  },
  {
    slug: "data-analyst-jr",
    seniority: "junior",
    skills: ["sql", "excel", "power-bi", "python", "data-analysis"],
    es: {
      title: "Data Analyst Jr",
      description: `## Qué vas a hacer

- Armar reportes y tableros para las distintas áreas.
- Escribir consultas SQL para responder preguntas del negocio.
- Revisar la calidad de los datos.

## Qué buscamos

- SQL y Excel o Google Sheets.
- Nociones de alguna herramienta de visualización (Power BI, Tableau).
- Curiosidad y capacidad para explicar números en simple.

## Qué ofrecemos

- Acompañamiento del equipo de datos.
- Capacitaciones en Python.`,
    },
    en: {
      title: "Junior Data Analyst",
      description: `## What you'll do

- Build reports and dashboards for different teams.
- Write SQL queries to answer business questions.
- Check data quality.

## What we're looking for

- SQL and Excel or Google Sheets.
- Basic knowledge of a visualization tool (Power BI, Tableau).
- Curiosity and the ability to explain numbers simply.

## What we offer

- Support from the data team.
- Python training.`,
    },
  },
];

export function findTemplate(slug: unknown) {
  return typeof slug === "string" ? JOB_TEMPLATES.find((t) => t.slug === slug) : undefined;
}
