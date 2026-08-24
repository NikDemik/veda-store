'use client';

import { useState } from 'react';
import { ClipboardList, FileText, PackageCheck, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate, formatMoney, getOrderStatusTone } from '../admin-format';
import { inputClassName, Metric, SectionTitle, StatusBadge } from '../admin-ui';
import type {
    AdminDashboardLabels,
    AdminOrder,
    FulfillmentStatus,
    OrderStatus,
    PaymentStatus,
} from '../types';

type OrdersTabProps = {
    orders: AdminOrder[];
    labels: AdminDashboardLabels;
};

const orderStatusOptions: OrderStatus[] = ['NEW', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED'];
const paymentStatusOptions: PaymentStatus[] = ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'];
const fulfillmentStatusOptions: FulfillmentStatus[] = ['ASSEMBLING', 'SHIPPED', 'DELIVERED'];

export function OrdersTab({ orders, labels }: OrdersTabProps) {
    const [currentOrders, setCurrentOrders] = useState(orders);
    const [savingOrderId, setSavingOrderId] = useState<number | null>(null);
    const [generatingInvoiceId, setGeneratingInvoiceId] = useState<number | null>(null);
    const [viewedOrderId, setViewedOrderId] = useState<number | null>(null);
    const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
    const totalRevenue = currentOrders.reduce((sum, order) => sum + Number(order.grandTotal), 0);
    const activeOrders = currentOrders.filter(
        (order) => order.orderStatus !== 'COMPLETED' && order.orderStatus !== 'CANCELLED',
    ).length;
    const pendingPayments = currentOrders.filter(
        (order) => order.paymentStatus === 'PENDING' || order.paymentStatus === 'OVERDUE',
    ).length;
    const pendingDocuments = currentOrders.filter((order) => !order.invoices.length).length;

    async function updateOrderStatuses(
        order: AdminOrder,
        statuses: Pick<AdminOrder, 'orderStatus' | 'paymentStatus' | 'fulfillmentStatus'>,
    ) {
        if (savingOrderId === order.id) return;
        setSavingOrderId(order.id);
        setMessage(null);

        try {
            const response = await fetch(`/api/admin/orders/${order.id}/statuses`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(statuses),
            });
            const result = (await response.json().catch(() => null)) as {
                order?: Pick<AdminOrder, 'id' | 'orderStatus' | 'paymentStatus' | 'fulfillmentStatus'>;
                error?: string;
            } | null;

            if (!response.ok || !result?.order) {
                throw new Error(result?.error || 'Не удалось обновить статусы заказа.');
            }

            setCurrentOrders((items) =>
                items.map((item) =>
                    item.id === result.order?.id ? { ...item, ...result.order } : item,
                ),
            );
        } catch (error) {
            setMessage({
                tone: 'error',
                text: error instanceof Error ? error.message : 'Не удалось обновить статусы заказа.',
            });
        } finally {
            setSavingOrderId(null);
        }
    }

    async function generateInvoice(order: AdminOrder) {
        if (generatingInvoiceId !== null) return;
        const hasBackorder = order.items.some(
            (item) => item.requiresConfirmation || item.availabilityAtOrder === 'BACKORDER',
        );

        if (
            hasBackorder &&
            !window.confirm(
                'Убедитесь, что цена и срок поставки товаров «Под заказ» согласованы с клиентом. Сформировать счет?',
            )
        ) {
            return;
        }

        setGeneratingInvoiceId(order.id);
        setMessage(null);

        try {
            const response = await fetch(`/api/admin/orders/${order.id}/invoice`, { method: 'POST' });
            const result = (await response.json().catch(() => null)) as {
                invoice?: AdminOrder['invoices'][number];
                error?: string;
            } | null;

            if (!response.ok || !result?.invoice) {
                throw new Error(result?.error || 'Не удалось сформировать счет.');
            }

            setCurrentOrders((items) =>
                items.map((item) =>
                    item.id === order.id
                        ? {
                              ...item,
                              documentStatus: 'GENERATED',
                              invoices: [result.invoice!],
                          }
                        : item,
                ),
            );
            setMessage({ tone: 'success', text: `Счет ${result.invoice.number} сформирован.` });
        } catch (error) {
            setMessage({
                tone: 'error',
                text: error instanceof Error ? error.message : 'Не удалось сформировать счет.',
            });
        } finally {
            setGeneratingInvoiceId(null);
        }
    }

    return (
        <section className="rounded-[2rem] border border-grey/80 bg-white p-6 sm:p-8">
            <SectionTitle
                title="Заказы"
                description="Последние 100 заказов: статусы, товары под заказ и счета."
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Metric icon={ClipboardList} label="Всего заказов" value={currentOrders.length.toString()} />
                <Metric icon={PackageCheck} label="Активные" value={activeOrders.toString()} />
                <Metric icon={ReceiptText} label="К оплате" value={pendingPayments.toString()} />
                <Metric icon={FileText} label="Без счета" value={pendingDocuments.toString()} />
            </div>

            <div className="mt-6 flex flex-col gap-2 rounded-3xl bg-grey/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-black">Оборот: {formatMoney(totalRevenue)}</p>
                <p className="text-sm text-dark-grey">Показаны последние 100 заказов</p>
            </div>

            {message ? (
                <div
                    className={`mt-4 rounded-[8px] border px-4 py-3 text-sm ${
                        message.tone === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : 'border-[#f3b9b9] bg-[#fde6e6] text-[#a12b2b]'
                    }`}
                >
                    {message.text}
                </div>
            ) : null}

            <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[1480px] border-collapse text-left text-sm">
                    <thead className="bg-grey text-xs uppercase tracking-[0.12em] text-dark-grey">
                        <tr>
                            <th className="px-4 py-3 font-medium">Номер</th>
                            <th className="px-4 py-3 font-medium">Дата</th>
                            <th className="px-4 py-3 font-medium">Организация</th>
                            <th className="px-4 py-3 font-medium">Сумма</th>
                            <th className="px-4 py-3 font-medium">Заказ</th>
                            <th className="px-4 py-3 font-medium">Оплата</th>
                            <th className="px-4 py-3 font-medium">Выполнение</th>
                            <th className="px-4 py-3 font-medium">Поставка</th>
                            <th className="px-4 py-3 font-medium">Счет</th>
                            <th className="px-4 py-3 font-medium">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentOrders.map((order) => {
                            const invoice = order.invoices[0];
                            const hasBackorder = order.items.some(
                                (item) => item.requiresConfirmation || item.availabilityAtOrder === 'BACKORDER',
                            );
                            const isSaving = savingOrderId === order.id;

                            return (
                                <OrderRow
                                    key={order.id}
                                    order={order}
                                    invoice={invoice}
                                    hasBackorder={hasBackorder}
                                    isSaving={isSaving}
                                    isGenerating={generatingInvoiceId === order.id}
                                    isViewed={viewedOrderId === order.id}
                                    labels={labels}
                                    onView={() => setViewedOrderId(viewedOrderId === order.id ? null : order.id)}
                                    onGenerate={() => generateInvoice(order)}
                                    onStatusChange={(statuses) => updateOrderStatuses(order, statuses)}
                                />
                            );
                        })}
                    </tbody>
                </table>
                {!currentOrders.length ? (
                    <p className="py-8 text-center text-dark-grey">Заказов пока нет.</p>
                ) : null}
            </div>
        </section>
    );
}

type OrderRowProps = {
    order: AdminOrder;
    invoice: AdminOrder['invoices'][number] | undefined;
    hasBackorder: boolean;
    isSaving: boolean;
    isGenerating: boolean;
    isViewed: boolean;
    labels: AdminDashboardLabels;
    onView: () => void;
    onGenerate: () => void;
    onStatusChange: (
        statuses: Pick<AdminOrder, 'orderStatus' | 'paymentStatus' | 'fulfillmentStatus'>,
    ) => void;
};

function OrderRow(props: OrderRowProps) {
    const { order, invoice, hasBackorder, isSaving, isGenerating, isViewed, labels } = props;
    const selectClassName = `${inputClassName} min-w-[150px] py-2 text-xs`;

    return (
        <>
            <tr className="border-t border-border align-top">
                <td className="px-4 py-4 font-semibold text-black">{order.number}</td>
                <td className="px-4 py-4 text-dark-grey">{formatDate(order.createdAt)}</td>
                <td className="px-4 py-4">
                    <p className="font-medium text-black">{order.organization.shortName ?? order.organization.fullName}</p>
                    <p className="mt-1 text-xs text-dark-grey">ИНН {order.organization.inn}</p>
                </td>
                <td className="px-4 py-4 font-semibold text-black">{formatMoney(order.grandTotal)}</td>
                <td className="px-4 py-4">
                    <select
                        className={`${selectClassName} ${getOrderStatusTone(order.orderStatus)}`}
                        value={order.orderStatus}
                        disabled={isSaving}
                        onChange={(event) =>
                            props.onStatusChange({
                                orderStatus: event.target.value as OrderStatus,
                                paymentStatus: order.paymentStatus,
                                fulfillmentStatus: order.fulfillmentStatus,
                            })
                        }
                    >
                        {orderStatusOptions.map((status) => <option key={status} value={status}>{labels.orderStatus[status]}</option>)}
                    </select>
                </td>
                <td className="px-4 py-4">
                    <select
                        className={selectClassName}
                        value={order.paymentStatus}
                        disabled={isSaving}
                        onChange={(event) =>
                            props.onStatusChange({
                                orderStatus: order.orderStatus,
                                paymentStatus: event.target.value as PaymentStatus,
                                fulfillmentStatus: order.fulfillmentStatus,
                            })
                        }
                    >
                        {paymentStatusOptions.map((status) => <option key={status} value={status}>{labels.paymentStatus[status]}</option>)}
                    </select>
                </td>
                <td className="px-4 py-4">
                    <select
                        className={selectClassName}
                        value={order.fulfillmentStatus}
                        disabled={isSaving}
                        onChange={(event) =>
                            props.onStatusChange({
                                orderStatus: order.orderStatus,
                                paymentStatus: order.paymentStatus,
                                fulfillmentStatus: event.target.value as FulfillmentStatus,
                            })
                        }
                    >
                        {fulfillmentStatusOptions.map((status) => <option key={status} value={status}>{labels.fulfillmentStatus[status]}</option>)}
                    </select>
                </td>
                <td className="px-4 py-4">
                    {hasBackorder ? (
                        <span className="inline-flex rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">Под заказ</span>
                    ) : (
                        <span className="text-dark-grey">В наличии</span>
                    )}
                </td>
                <td className="px-4 py-4">
                    {invoice ? (
                        <div className="space-y-1">
                            <p className="font-medium text-black">{invoice.number}</p>
                            <StatusBadge>{invoice.status}</StatusBadge>
                        </div>
                    ) : (
                        <span className="text-dark-grey">Не сформирован</span>
                    )}
                </td>
                <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={props.onView}>
                            {isViewed ? 'Скрыть' : 'Просмотр'}
                        </Button>
                        {invoice?.storageKey ? (
                            <Button variant="ghost" size="sm" asChild>
                                <a href={`/api/admin/orders/${order.id}/invoice/download`}>Скачать счет</a>
                            </Button>
                        ) : (
                            <Button size="sm" disabled={isGenerating} onClick={props.onGenerate}>
                                {isGenerating
                                    ? 'Формируем...'
                                    : invoice
                                      ? 'Сформировать PDF'
                                      : 'Сформировать счет'}
                            </Button>
                        )}
                    </div>
                </td>
            </tr>
            {isViewed ? (
                <tr className="border-t border-border bg-grey/20">
                    <td colSpan={10} className="px-6 py-5">
                        <div className="grid gap-5 lg:grid-cols-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-dark-grey">Контакт</p>
                                <p className="mt-2 font-medium text-black">
                                    {order.createdByUser
                                        ? `${order.createdByUser.firstName} ${order.createdByUser.lastName}`
                                        : 'Не указан'}
                                </p>
                                {order.createdByUser ? <p className="text-sm text-dark-grey">{order.createdByUser.email}</p> : null}
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-dark-grey">Доставка</p>
                                <p className="mt-2 text-black">{order.shippingCompany || order.deliveryType}</p>
                                <p className="text-sm text-dark-grey">{order.trackingNumber || 'Без трек-номера'}</p>
                                <p className="text-sm text-dark-grey">План: {formatDate(order.estimatedDeliveryAt)}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-dark-grey">Состав заказа</p>
                                <ul className="mt-2 space-y-2">
                                    {order.items.map((item) => (
                                        <li key={item.id} className="text-sm text-black">
                                            {item.productName} ({item.productSku}) — {item.quantity} шт.
                                            {item.requiresConfirmation || item.availabilityAtOrder === 'BACKORDER'
                                                ? ' · Под заказ'
                                                : ''}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </td>
                </tr>
            ) : null}
        </>
    );
}
