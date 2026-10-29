import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkText = "View all",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">{eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {title}
        </h2>
        {description && <p className="mt-2 max-w-2xl text-sm text-slate-400">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="mb-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-cyan-300">
          {linkText}<ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
