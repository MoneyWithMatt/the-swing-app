import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes
} from "react";
import { humanSubmissionStatus } from "@/lib/format";
import type { SubmissionStatus } from "@/lib/types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className
}: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  return cn(
    "focus-ring inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" && "h-9 px-3 text-sm",
    size === "md" && "min-h-11 px-4 text-sm",
    size === "icon" && "h-10 w-10 p-0",
    variant === "primary" && "border-moss bg-moss text-white hover:bg-ink",
    variant === "secondary" && "border-ink/15 bg-white text-ink hover:border-moss hover:bg-mist",
    variant === "ghost" && "border-transparent bg-transparent text-ink hover:bg-mist",
    variant === "danger" && "border-clay bg-clay text-white hover:bg-ink",
    className
  );
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonClasses({ variant, size, className })} {...props} />;
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  children: ReactNode;
};

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{children}</main>;
}

export function TopBar({
  eyebrow,
  title,
  actions
}: {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-ink/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-bold uppercase text-moss">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl font-bold leading-tight text-ink sm:text-4xl">{title}</h1>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mb-3 flex flex-col gap-1">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {detail ? <p className="text-sm leading-6 text-ink/65">{detail}</p> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold",
        status === "submitted" && "border-flag/50 bg-flag/20 text-ink",
        status === "in_review" && "border-moss/30 bg-moss/10 text-moss",
        status === "ready" && "border-fairway/40 bg-fairway/15 text-moss"
      )}
    >
      {humanSubmissionStatus(status)}
    </span>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-sm font-bold text-ink">{children}</label>;
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "focus-ring w-full rounded-md border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink/40",
        props.className
      )}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "focus-ring min-h-28 w-full resize-y rounded-md border border-ink/15 bg-white px-3 py-2.5 text-sm leading-6 text-ink placeholder:text-ink/40",
        props.className
      )}
    />
  );
}

export function Divider() {
  return <div className="my-5 h-px bg-ink/10" />;
}
