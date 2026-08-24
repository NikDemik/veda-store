import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export const inputClassName =
    'w-full rounded-[8px] border border-grey/80 bg-white px-4 py-3 text-sm text-black outline-none transition-colors placeholder:text-dark-grey/70 focus:border-accent';

export function SectionTitle({ title, description }: { title: string; description: string }) {
    return (
        <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-black lg:text-3xl">{title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-dark-grey">{description}</p>
        </div>
    );
}

export function Metric({
    icon: Icon,
    label,
    value,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-3xl border border-grey/80 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-dark-grey">{label}</p>
                <Icon className="size-5 text-accent" aria-hidden="true" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-black">{value}</p>
        </div>
    );
}

export function StatusBadge({
    className = 'bg-grey text-black',
    children,
}: {
    className?: string;
    children: string;
}) {
    return (
        <span className={`rounded-[8px] px-2.5 py-1 text-xs font-medium ${className}`}>
            {children}
        </span>
    );
}

export function InfoLine({ label, value }: { label: string; value: string }) {
    return (
        <p className="flex items-center justify-between gap-3">
            <span>{label}</span>
            <span className="text-right font-medium text-black">{value}</span>
        </p>
    );
}

export function SummaryCell({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-3xl bg-grey/20 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-dark-grey">{label}</p>
            <p className="mt-2 text-base font-semibold text-black">{value}</p>
        </div>
    );
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block space-y-2 text-sm font-medium text-black">
            <span>{label}</span>
            {children}
        </label>
    );
}
