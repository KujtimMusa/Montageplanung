import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function StammdatenSection({
  title,
  description,
  actions,
  children,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-zinc-800/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-50">
            {title}
          </h2>
          {description ? (
            <p className="max-w-2xl text-xs leading-relaxed text-zinc-500">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap gap-2 sm:ml-auto sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
