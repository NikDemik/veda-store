import { NextResponse } from 'next/server';
import { catalogImportConfig } from '@/config/catalogImport';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import type { CatalogImportMode } from '@/types/catalog-import';

export async function requireCatalogImportUser(mode: CatalogImportMode = 'FULL') {
    const user = await getCurrentStaffUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const roles = mode === 'STOCK' ? catalogImportConfig.stockWritableRoles : catalogImportConfig.writableRoles;
    if (!roles.has(user.role)) return NextResponse.json({ error: 'Недостаточно прав для выбранного режима импорта.' }, { status: 403 });
    return user;
}

export function parseImportId(value: string) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

export const catalogImportSelect = {
    id: true, fileName: true, fileSize: true, fileHash: true, mode: true, status: true,
    totalRows: true, createdCount: true, updatedCount: true, unchangedCount: true,
    errorCount: true, duplicateOfId: true, errorMessage: true, startedAt: true,
    completedAt: true, createdAt: true,
    uploadedBy: { select: { firstName: true, lastName: true, email: true } },
} as const;

export function serializeImport<T extends { createdAt: Date; startedAt: Date | null; completedAt: Date | null }>(value: T) {
    return { ...value, createdAt: value.createdAt.toISOString(), startedAt: value.startedAt?.toISOString() ?? null, completedAt: value.completedAt?.toISOString() ?? null };
}

export function safeImportError(error: unknown) {
    if (error instanceof Error && error.message && !/Prisma|SQL|stack/i.test(error.message)) return error.message;
    return 'Не удалось обработать импорт номенклатуры.';
}
