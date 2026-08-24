import type {
    ContactLead,
    NotificationChannel,
    NotificationEventType,
    NotificationSetting,
} from '@prisma/client';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

type NotificationPayload = {
    subject?: string;
    text: string;
    html?: string;
};

const MAX_NOTIFICATION_ATTEMPTS = 3;
const NOTIFICATION_RETRY_DELAYS_MS = [1_000, 3_000];

type OrderNotificationInput = {
    id: number;
    number: string;
    grandTotal: unknown;
    organization: {
        fullName: string;
        shortName: string | null;
        inn: string;
        email: string | null;
    };
    createdByUser: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string | null;
    } | null;
    items: Array<{
        productSku: string;
        productName: string;
        quantity: number;
        lineTotal: unknown;
    }>;
};

function nullable(value: string | null | undefined) {
    const trimmed = value?.trim();

    return trimmed ? trimmed : null;
}

function formatMoney(value: unknown) {
    const amount =
        typeof value === 'object' && value && 'toNumber' in value
            ? (value as { toNumber(): number }).toNumber()
            : Number(value);

    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function toHtml(text: string) {
    return text
        .split('\n')
        .map((line) => (line ? escapeHtml(line) : '&nbsp;'))
        .join('<br>');
}

function buildLeadAdminPayload(lead: ContactLead): NotificationPayload {
    const subject = `Новая заявка #${lead.id}`;
    const text = [
        subject,
        '',
        `Имя: ${lead.name}`,
        `Телефон: ${lead.phone}`,
        `Email: ${lead.email}`,
        `Источник: ${lead.source}`,
        `Согласие на обработку ПДн: ${lead.consent ? 'да' : 'нет'}`,
        lead.message ? `Сообщение: ${lead.message}` : null,
    ]
        .filter(Boolean)
        .join('\n');

    return { subject, text, html: toHtml(text) };
}

function buildLeadCustomerPayload(lead: ContactLead): NotificationPayload {
    const subject = 'Заявка получена';
    const text = [
        `${lead.name}, ваша заявка получена.`,
        '',
        'Мы свяжемся с вами в ближайшее рабочее время.',
        `Телефон: ${lead.phone}`,
    ].join('\n');

    return { subject, text, html: toHtml(text) };
}

function buildOrderAdminPayload(order: OrderNotificationInput): NotificationPayload {
    const subject = `Новый заказ ${order.number}`;
    const items = order.items
        .map(
            (item) =>
                `${item.productSku} - ${item.productName}, ${item.quantity} шт., ${formatMoney(item.lineTotal)}`,
        )
        .join('\n');
    const contact = order.createdByUser
        ? `${order.createdByUser.firstName} ${order.createdByUser.lastName}, ${order.createdByUser.email}${
              order.createdByUser.phone ? `, ${order.createdByUser.phone}` : ''
          }`
        : 'Не указан';
    const text = [
        subject,
        '',
        `Компания: ${order.organization.shortName || order.organization.fullName}`,
        `ИНН: ${order.organization.inn}`,
        `Контакт: ${contact}`,
        `Сумма: ${formatMoney(order.grandTotal)}`,
        '',
        'Состав заказа:',
        items,
    ].join('\n');

    return { subject, text, html: toHtml(text) };
}

function buildOrderCustomerPayload(order: OrderNotificationInput): NotificationPayload {
    const subject = 'Заказ создан';
    const text = [
        `Ваш заказ ${order.number} создан.`,
        '',
        `Сумма заказа: ${formatMoney(order.grandTotal)}`,
        'Счет и документы доступны в личном кабинете.',
    ].join('\n');

    return { subject, text, html: toHtml(text) };
}

function canSendTelegram(settings: NotificationSetting) {
    return settings.isActive && settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId;
}

function canSendEmail(settings: NotificationSetting) {
    return (
        settings.isActive &&
        settings.smtpHost &&
        settings.smtpPort &&
        settings.smtpFromEmail &&
        (settings.smtpUser || settings.smtpPassword ? settings.smtpUser && settings.smtpPassword : true)
    );
}

async function createEvent(params: {
    type: NotificationEventType;
    channel: NotificationChannel;
    target: string;
    payload: NotificationPayload;
    contactLeadId?: number;
    orderId?: number;
}) {
    const event = await prisma.notificationEvent.create({
        data: {
            type: params.type,
            channel: params.channel,
            target: params.target,
            payload: params.payload,
            contactLeadId: params.contactLeadId,
            orderId: params.orderId,
        },
        select: { id: true },
    });

    await dispatchNotificationEvent(event.id);
}

export async function notifyContactLeadCreated(lead: ContactLead) {
    const settings = await prisma.notificationSetting.findFirst({
        orderBy: { createdAt: 'asc' },
    });

    if (!settings?.isActive || !settings.notifyLeadCreated) return;

    const tasks: Array<Promise<void>> = [];

    if (canSendTelegram(settings)) {
        tasks.push(
            createEvent({
                type: 'CONTACT_LEAD_CREATED',
                channel: 'TELEGRAM',
                target: settings.telegramChatId || '',
                payload: buildLeadAdminPayload(lead),
                contactLeadId: lead.id,
            }),
        );
    }

    if (settings.salesEmailEnabled && settings.salesEmail && canSendEmail(settings)) {
        tasks.push(
            createEvent({
                type: 'CONTACT_LEAD_CREATED',
                channel: 'EMAIL',
                target: settings.salesEmail,
                payload: buildLeadAdminPayload(lead),
                contactLeadId: lead.id,
            }),
        );
    }

    if (settings.customerEmailEnabled && canSendEmail(settings)) {
        tasks.push(
            createEvent({
                type: 'CONTACT_LEAD_CREATED',
                channel: 'EMAIL',
                target: lead.email,
                payload: buildLeadCustomerPayload(lead),
                contactLeadId: lead.id,
            }),
        );
    }

    await Promise.allSettled(tasks);
}

export async function notifyOrderCreated(orderId: number) {
    const [settings, order] = await Promise.all([
        prisma.notificationSetting.findFirst({ orderBy: { createdAt: 'asc' } }),
        prisma.order.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                number: true,
                grandTotal: true,
                organization: {
                    select: {
                        fullName: true,
                        shortName: true,
                        inn: true,
                        email: true,
                    },
                },
                createdByUser: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                    },
                },
                items: {
                    select: {
                        productSku: true,
                        productName: true,
                        quantity: true,
                        lineTotal: true,
                    },
                },
            },
        }),
    ]);

    if (!settings?.isActive || !settings.notifyOrderCreated || !order) return;

    const tasks: Array<Promise<void>> = [];

    if (canSendTelegram(settings)) {
        tasks.push(
            createEvent({
                type: 'ORDER_CREATED',
                channel: 'TELEGRAM',
                target: settings.telegramChatId || '',
                payload: buildOrderAdminPayload(order),
                orderId: order.id,
            }),
        );
    }

    if (settings.salesEmailEnabled && settings.salesEmail && canSendEmail(settings)) {
        tasks.push(
            createEvent({
                type: 'ORDER_CREATED',
                channel: 'EMAIL',
                target: settings.salesEmail,
                payload: buildOrderAdminPayload(order),
                orderId: order.id,
            }),
        );
    }

    const customerEmail = order.createdByUser?.email || nullable(order.organization.email);

    if (settings.customerEmailEnabled && customerEmail && canSendEmail(settings)) {
        tasks.push(
            createEvent({
                type: 'ORDER_CREATED',
                channel: 'EMAIL',
                target: customerEmail,
                payload: buildOrderCustomerPayload(order),
                orderId: order.id,
            }),
        );
    }

    await Promise.allSettled(tasks);
}

export async function dispatchNotificationEvent(eventId: number) {
    const settings = await prisma.notificationSetting.findFirst({
        orderBy: { createdAt: 'asc' },
    });

    if (!settings) return;

    while (true) {
        const event = await prisma.notificationEvent.findUnique({
            where: { id: eventId },
        });

        if (!event || event.status === 'SENT' || event.attempts >= MAX_NOTIFICATION_ATTEMPTS) {
            return;
        }

        const payload = event.payload as NotificationPayload;

        const claimedAttempt = await prisma.notificationEvent.updateMany({
            where: {
                id: event.id,
                attempts: event.attempts,
                status: { not: 'SENT' },
            },
            data: {
                attempts: { increment: 1 },
                status: 'PENDING',
                lastError: null,
            },
        });

        if (claimedAttempt.count === 0) {
            continue;
        }

        try {
            if (event.channel === 'EMAIL') {
                await sendEmail(settings, event.target, payload);
            } else {
                await sendTelegram(settings, payload.text);
            }

            await prisma.notificationEvent.updateMany({
                where: {
                    id: event.id,
                    status: { not: 'SENT' },
                },
                data: {
                    status: 'SENT',
                    sentAt: new Date(),
                    lastError: null,
                },
            });

            return;
        } catch (error) {
            const attempts = event.attempts + 1;

            await prisma.notificationEvent.updateMany({
                where: {
                    id: event.id,
                    status: { not: 'SENT' },
                },
                data: {
                    status: attempts >= MAX_NOTIFICATION_ATTEMPTS ? 'FAILED' : 'PENDING',
                    lastError:
                        error instanceof Error ? error.message : 'Notification dispatch failed',
                },
            });

            if (attempts >= MAX_NOTIFICATION_ATTEMPTS) {
                return;
            }

            await new Promise((resolve) =>
                setTimeout(resolve, NOTIFICATION_RETRY_DELAYS_MS[attempts - 1] ?? 3_000),
            );
        }
    }
}

async function sendEmail(
    settings: NotificationSetting,
    target: string | null,
    payload: NotificationPayload,
) {
    if (!target) throw new Error('Email recipient is not configured');
    if (!canSendEmail(settings)) throw new Error('SMTP settings are incomplete');

    const transporter = nodemailer.createTransport({
        host: settings.smtpHost || '',
        port: settings.smtpPort,
        secure: settings.smtpSecure,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        auth:
            settings.smtpUser && settings.smtpPassword
                ? {
                      user: settings.smtpUser,
                      pass: settings.smtpPassword,
                  }
                : undefined,
    });

    await transporter.sendMail({
        from: settings.smtpFromName
            ? `"${settings.smtpFromName}" <${settings.smtpFromEmail}>`
            : settings.smtpFromEmail || undefined,
        to: target,
        subject: payload.subject || 'Уведомление',
        text: payload.text,
        html: payload.html,
    });
}

async function sendTelegram(settings: NotificationSetting, text: string) {
    if (!canSendTelegram(settings)) throw new Error('Telegram settings are incomplete');

    const response = await fetch(
        `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(10000),
            body: JSON.stringify({
                chat_id: settings.telegramChatId,
                text,
                disable_web_page_preview: true,
            }),
        },
    );

    if (!response.ok) {
        const message = await response.text();
        throw new Error(`Telegram API error: ${message}`);
    }
}
