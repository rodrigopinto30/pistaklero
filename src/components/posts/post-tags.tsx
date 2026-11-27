import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Las etiquetas de una publicación, cada una lleva al listado filtrado ("#ia"). */
export function PostTags({ tags, label, className }: { tags: string[]; label: string; className?: string }) {
  if (tags.length === 0) return null;
  return (
    <ul aria-label={label} className={cn("relative z-10 flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <li key={tag}>
          <Link
            href={{ pathname: "/posts", query: { tag } }}
            className="inline-flex min-h-7 items-center rounded-full bg-primary/10 px-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
          >
            #{tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}
