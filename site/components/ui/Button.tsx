import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "ghost" | "ghost-dark";

const base =
  "inline-flex items-center justify-center gap-2 rounded-control px-6 py-3 text-[0.9375rem] font-semibold " +
  "transition-colors duration-[180ms] ease-out focus-visible:outline-2 focus-visible:outline-offset-2";

const variants: Record<Variant, string> = {
  // The one marigold element. ink text on marigold, shifts one step on hover.
  primary: "bg-marigold-600 text-ink-900 hover:bg-marigold-500",
  // Outlined, transparent — for light surfaces.
  ghost: "border border-ink-900/25 text-ink-900 hover:border-ink-900/60 hover:bg-silk-100",
  // Outlined for dark surfaces.
  "ghost-dark": "border border-silk-50/30 text-silk-50 hover:border-silk-50/70 hover:bg-white/5",
};

type ButtonProps = {
  variant?: Variant;
  children: ReactNode;
} & (
  | ({ href: string } & Omit<ComponentProps<typeof Link>, "href" | "className">)
  | ({ href?: undefined } & ComponentProps<"button">)
);

export function Button({ variant = "primary", children, ...props }: ButtonProps) {
  const className = `${base} ${variants[variant]}`;
  if (props.href) {
    const { href, ...rest } = props;
    return (
      <Link href={href} className={className} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button className={className} {...(props as ComponentProps<"button">)}>
      {children}
    </button>
  );
}
