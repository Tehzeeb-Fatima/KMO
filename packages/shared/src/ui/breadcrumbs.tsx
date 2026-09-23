import { cn } from "../lib/utils";

export interface BreadcrumbItem {
  label: string;
  /** Omit on the current page — the last crumb is never a link. */
  href?: string;
}

const DefaultLink = ({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <a href={href} className={className}>
    {children}
  </a>
);

/** Breadcrumb trail for inner pages. Every crumb with an `href` is a real
 *  link; the last one is the current page and stays plain text. */
export function Breadcrumbs({
  items,
  LinkComponent = DefaultLink,
  className,
}: {
  items: BreadcrumbItem[];
  LinkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
  }>;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("mb-4 text-[12.5px] text-muted", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {item.href && !last ? (
                <LinkComponent href={item.href} className="hover:text-primary hover:underline">
                  {item.label}
                </LinkComponent>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={last ? "font-semibold text-ink-dark" : undefined}
                >
                  {item.label}
                </span>
              )}
              {last ? null : (
                <span aria-hidden className="text-muted-table">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
