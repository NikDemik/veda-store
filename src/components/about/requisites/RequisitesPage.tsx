import type { ReactNode } from 'react';
import { prisma } from '@/lib/prisma';

export default async function RequisitesPage() {
    const company = await prisma.companyProfile.findFirst({
        where: { isActive: true },
        orderBy: { id: 'asc' },
        include: {
            bankAccounts: {
                where: { isActive: true },
                orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
                take: 1,
            },
        },
    });
    const bankAccount = company?.bankAccounts[0];

    return (
        <section className="relative w-screen pt-12">
            <div className="relative container mx-auto space-y-8 px-5">
                <h1 className="mb-8 uppercase text-black dark:text-white">Реквизиты</h1>

                {company ? (
                    <div className="mt-8 grid gap-6 lg:grid-cols-2">
                        <RequisitesCard title="Информация о компании">
                            <Requisite label="Полное наименование" value={company.fullName} />
                            <Requisite label="Краткое наименование" value={company.shortName} />
                            <Requisite label="ИНН" value={company.inn} />
                            <Requisite label="КПП" value={company.kpp} />
                            <Requisite label="ОГРН" value={company.ogrn} />
                            <Requisite label="Юридический адрес" value={company.legalAddress} />
                            <Requisite label="Фактический адрес" value={company.actualAddress} />
                            <Requisite label="Генеральный директор" value={company.directorName} />
                        </RequisitesCard>

                        <RequisitesCard title="Банковские реквизиты">
                            {bankAccount ? (
                                <>
                                    <Requisite
                                        label="Получатель"
                                        value={
                                            bankAccount.recipientName ||
                                            company.shortName ||
                                            company.fullName
                                        }
                                    />
                                    <Requisite label="Банк" value={bankAccount.bankName} />
                                    <Requisite
                                        label="Адрес банка"
                                        value={bankAccount.bankAddress}
                                    />
                                    <Requisite label="БИК" value={bankAccount.bik} />
                                    <Requisite
                                        label="Расчетный счет"
                                        value={bankAccount.checkingAccount}
                                    />
                                    <Requisite
                                        label="Корреспондентский счет"
                                        value={bankAccount.correspondentAccount}
                                    />
                                </>
                            ) : (
                                <p className="text-dark-grey dark:text-white/70">
                                    Банковские реквизиты пока не опубликованы.
                                </p>
                            )}
                        </RequisitesCard>
                    </div>
                ) : (
                    <div className="mt-8 rounded-3xl border border-grey/80 p-6 text-dark-grey dark:border-white/20 dark:text-white/70">
                        Реквизиты компании пока не опубликованы.
                    </div>
                )}
            </div>
        </section>
    );
}

function RequisitesCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <article className="rounded-3xl border border-grey/80 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/20 dark:bg-white/5 sm:p-8">
            <h1 className="text-xl font-semibold text-black dark:text-white">{title}</h1>
            <dl className="mt-6 space-y-4">{children}</dl>
        </article>
    );
}

function Requisite({ label, value }: { label: string; value: string | null }) {
    if (!value) return null;

    return (
        <div className="border-b border-grey/70 pb-4 last:border-b-0 last:pb-0 dark:border-white/15">
            <dt className="text-sm text-dark-grey dark:text-white/60">{label}</dt>
            <dd className="mt-1 break-words font-medium text-black dark:text-white">{value}</dd>
        </div>
    );
}
