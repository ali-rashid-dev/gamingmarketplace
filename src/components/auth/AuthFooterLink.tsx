import Link from "next/link";

export function AuthFooterLink({
  text,
  linkText,
  to,
  href,
}: {
  text?: string;
  linkText: string;
  to?: string;
  href?: string;
}) {
  const targetPath = to || href || "#";

  return (
    <p className="text-center text-sm text-muted-foreground">
      {text ? `${text} ` : null}
      <Link
        href={targetPath}
        className="font-medium text-gold underline-offset-4 transition-colors hover:text-gold/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 rounded"
      >
        {linkText}
      </Link>
    </p>
  );
}
