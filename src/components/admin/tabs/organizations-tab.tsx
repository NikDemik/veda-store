'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Building2, PackageCheck, Users } from 'lucide-react';
import { formatDate, formatMoney, getActivityTone } from '../admin-format';
import { InfoLine, Metric, SectionTitle, StatusBadge, SummaryCell } from '../admin-ui';
import type { AdminOrganization } from '../types';

type OrganizationsTabProps = {
    organizations: AdminOrganization[];
};

export function OrganizationsTab({ organizations }: OrganizationsTabProps) {
    const router = useRouter();
    const [activatingOrganizationId, setActivatingOrganizationId] = useState<number | null>(null);
    const [activationError, setActivationError] = useState<string | null>(null);
    const activeOrganizations = organizations.filter((organization) => organization.isActive).length;
    const totalUsers = organizations.reduce((sum, organization) => sum + organization.users.length, 0);

    async function activateOrganization(organizationId: number) {
        if (activatingOrganizationId) return;

        setActivatingOrganizationId(organizationId);
        setActivationError(null);

        try {
            const response = await fetch(`/api/admin/organizations/${organizationId}/activate`, {
                method: 'PATCH',
            });
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;

            if (!response.ok) {
                throw new Error(payload?.error || 'Не удалось активировать организацию.');
            }

            router.refresh();
        } catch (error) {
            setActivationError(
                error instanceof Error ? error.message : 'Не удалось активировать организацию.',
            );
        } finally {
            setActivatingOrganizationId(null);
        }
    }

    return (
        <section className="rounded-[2rem] border border-grey/80 bg-white p-6 sm:p-8">
            <SectionTitle
                title="Организации"
                description="Клиентские организации с контактами, пользователями, заказами и финансовой сводкой."
            />

            <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Metric icon={Building2} label="Организации" value={organizations.length.toString()} />
                <Metric icon={PackageCheck} label="Активные" value={activeOrganizations.toString()} />
                <Metric icon={Users} label="Пользователи" value={totalUsers.toString()} />
            </div>

            {activationError ? (
                <p className="mt-6 rounded-[8px] bg-red-50 px-3 py-2 text-sm text-red-700">
                    {activationError}
                </p>
            ) : null}

            <div className="mt-6 space-y-4">
                {organizations.map((organization) => {
                    const organizationRevenue = organization.orders.reduce(
                        (sum, order) => sum + Number(order.grandTotal),
                        0,
                    );
                    const activeOrganizationOrders = organization.orders.filter(
                        (order) =>
                            order.orderStatus !== 'COMPLETED' && order.orderStatus !== 'CANCELLED',
                    ).length;
                    const overduePayments = organization.orders.filter(
                        (order) => order.paymentStatus === 'OVERDUE',
                    ).length;

                    return (
                        <article key={organization.id} className="rounded-3xl border border-grey/80 p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-lg font-semibold text-black">
                                            {organization.shortName || organization.fullName}
                                        </h2>
                                        <StatusBadge className={getActivityTone(organization.isActive)}>
                                            {organization.isActive ? 'Активна' : 'Отключена'}
                                        </StatusBadge>
                                        {!organization.isActive ? (
                                            <button
                                                type="button"
                                                onClick={() => activateOrganization(organization.id)}
                                                disabled={activatingOrganizationId === organization.id}
                                                className="inline-flex items-center justify-center rounded-[8px] bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {activatingOrganizationId === organization.id
                                                    ? 'Активация...'
                                                    : 'Активировать'}
                                            </button>
                                        ) : null}
                                    </div>
                                    <p className="mt-2 text-sm text-dark-grey">{organization.fullName}</p>
                                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-dark-grey">
                                        <span>Тип: {organization.type}</span>
                                        <span>ИНН {organization.inn}</span>
                                        {organization.kpp ? <span>КПП {organization.kpp}</span> : null}
                                    </div>
                                </div>
                                <div className="grid gap-2 text-sm text-dark-grey sm:grid-cols-2 lg:min-w-[360px]">
                                    <InfoLine label="Email" value={organization.email || 'Не указан'} />
                                    <InfoLine label="Телефон" value={organization.phone || 'Не указан'} />
                                    <InfoLine label="Сайт" value={organization.website || 'Не указан'} />
                                    <InfoLine label="Создана" value={formatDate(organization.createdAt)} />
                                </div>
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-4">
                                <SummaryCell label="Заказы" value={organization.orders.length.toString()} />
                                <SummaryCell label="Активные" value={activeOrganizationOrders.toString()} />
                                <SummaryCell label="Просрочки" value={overduePayments.toString()} />
                                <SummaryCell label="Оборот" value={formatMoney(organizationRevenue)} />
                            </div>

                            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                                <div className="rounded-3xl bg-grey/20 p-4">
                                    <p className="text-sm font-semibold text-black">Пользователи</p>
                                    <div className="mt-3 space-y-3">
                                        {organization.users.length > 0 ? (
                                            organization.users.map((user) => (
                                                <div
                                                    key={user.id}
                                                    className="flex flex-col gap-1 rounded-2xl bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium text-black">
                                                            {user.firstName} {user.lastName}
                                                        </p>
                                                        <p className="text-xs text-dark-grey">{user.email}</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 text-xs text-dark-grey">
                                                        <span>{user.role}</span>
                                                        <span>{user.isActive ? 'Активен' : 'Отключен'}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-dark-grey">Пользователей нет</p>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-3xl bg-grey/20 p-4">
                                    <p className="text-sm font-semibold text-black">Связанные данные</p>
                                    <div className="mt-3 space-y-2 text-sm text-dark-grey">
                                        <InfoLine
                                            label="Адреса"
                                            value={organization._count.addresses.toString()}
                                        />
                                        <InfoLine
                                            label="Документы"
                                            value={organization._count.documents.toString()}
                                        />
                                        <InfoLine
                                            label="Отсрочка"
                                            value={`${organization.deferredPaymentDays} дн.`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
