import { Socket } from 'node:net';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type TcpCheckResult =
    | { ok: true; host: string; port: number }
    | { ok: false; host: string; port: number; error: string; code?: string };

function getDatabaseTarget(connectionString: string) {
    const databaseUrl = new URL(connectionString);

    return {
        host: databaseUrl.hostname,
        port: databaseUrl.port ? Number(databaseUrl.port) : 3306,
        database: databaseUrl.pathname.replace(/^\//, ''),
    };
}

function getErrorDetails(error: unknown) {
    if (!(error instanceof Error)) {
        return { message: String(error) };
    }

    const details: Record<string, unknown> = {
        name: error.name,
        message: error.message,
    };

    const maybeError = error as Error & {
        code?: string;
        meta?: unknown;
        cause?: unknown;
    };

    if (maybeError.code) details.code = maybeError.code;
    if (maybeError.meta) details.meta = maybeError.meta;
    if (maybeError.cause instanceof Error) {
        details.cause = {
            name: maybeError.cause.name,
            message: maybeError.cause.message,
        };
    }

    return details;
}

function checkTcpConnection(host: string, port: number): Promise<TcpCheckResult> {
    return new Promise((resolve) => {
        const socket = new Socket();

        const finish = (result: TcpCheckResult) => {
            socket.removeAllListeners();
            socket.destroy();
            resolve(result);
        };

        socket.setTimeout(5000);
        socket.once('connect', () => finish({ ok: true, host, port }));
        socket.once('timeout', () => finish({ ok: false, host, port, error: 'TCP connection timed out' }));
        socket.once('error', (error: NodeJS.ErrnoException) => {
            finish({
                ok: false,
                host,
                port,
                error: error.message,
                code: error.code,
            });
        });

        socket.connect(port, host);
    });
}

export async function GET() {
    if (!process.env.DATABASE_URL) {
        return NextResponse.json(
            { ok: false, error: 'DATABASE_URL is not configured' },
            { status: 500 },
        );
    }

    let target: ReturnType<typeof getDatabaseTarget>;

    try {
        target = getDatabaseTarget(process.env.DATABASE_URL);
    } catch (error) {
        return NextResponse.json(
            { ok: false, error: 'DATABASE_URL is invalid', details: getErrorDetails(error) },
            { status: 500 },
        );
    }

    const tcp = await checkTcpConnection(target.host, target.port);

    if (!tcp.ok) {
        console.error('Database TCP health check failed', tcp);

        return NextResponse.json(
            {
                ok: false,
                target,
                tcp,
                error: 'Database TCP connection failed',
            },
            { status: 500 },
        );
    }

    try {
        const { prisma } = await import('@/lib/prisma');
        await prisma.$queryRaw`SELECT 1`;

        return NextResponse.json({ ok: true, target, tcp });
    } catch (error) {
        const details = getErrorDetails(error);
        console.error('Database Prisma health check failed', details);

        return NextResponse.json(
            {
                ok: false,
                target,
                tcp,
                error: 'Database Prisma query failed',
                details,
            },
            { status: 500 },
        );
    }
}
