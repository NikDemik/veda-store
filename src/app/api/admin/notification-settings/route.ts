import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const optionalEmail = z
    .string()
    .trim()
    .email('Некорректный email')
    .max(191)
    .optional()
    .or(z.literal(''));
const optionalText = z.string().trim().max(191).optional().nullable();

const notificationSettingsSchema = z.object({
    isActive: z.boolean().default(true),
    notifyLeadCreated: z.boolean().default(true),
    notifyOrderCreated: z.boolean().default(true),
    salesEmailEnabled: z.boolean().default(true),
    customerEmailEnabled: z.boolean().default(true),
    telegramEnabled: z.boolean().default(true),
    salesEmail: optionalEmail,
    smtpHost: optionalText,
    smtpPort: z.number().int().min(1).max(65535).default(587),
    smtpSecure: z.boolean().default(false),
    smtpUser: optionalText,
    smtpPassword: optionalText,
    smtpFromEmail: optionalEmail,
    smtpFromName: optionalText,
    telegramBotToken: optionalText,
    telegramChatId: optionalText,
});

function nullable(value: string | null | undefined) {
    return value && value.length > 0 ? value : null;
}

async function parseRequest(request: Request) {
    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return { error: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) };
    }

    const parsed = notificationSettingsSchema.safeParse(payload);

    if (!parsed.success) {
        return {
            error: NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Некорректные настройки уведомлений' },
                { status: 400 },
            ),
        };
    }

    return {
        data: {
            ...parsed.data,
            salesEmail: nullable(parsed.data.salesEmail),
            smtpHost: nullable(parsed.data.smtpHost),
            smtpUser: nullable(parsed.data.smtpUser),
            smtpPassword: nullable(parsed.data.smtpPassword),
            smtpFromEmail: nullable(parsed.data.smtpFromEmail),
            smtpFromName: nullable(parsed.data.smtpFromName),
            telegramBotToken: nullable(parsed.data.telegramBotToken),
            telegramChatId: nullable(parsed.data.telegramChatId),
        },
    };
}

export async function PATCH(request: Request) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = await parseRequest(request);

    if (parsed.error) return parsed.error;

    const currentSettings = await prisma.notificationSetting.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { id: true },
    });

    const notificationSetting = currentSettings
        ? await prisma.notificationSetting.update({
              where: { id: currentSettings.id },
              data: parsed.data,
          })
        : await prisma.notificationSetting.create({
              data: parsed.data,
          });

    return NextResponse.json({ notificationSetting });
}

export const POST = PATCH;
