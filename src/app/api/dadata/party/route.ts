import { NextResponse } from 'next/server';

const DADATA_PARTY_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party';

type DaDataAddressData = {
    postal_code?: string | null;
    region?: string | null;
    region_type?: string | null;
    area?: string | null;
    city?: string | null;
    city_type?: string | null;
    settlement?: string | null;
    settlement_type?: string | null;
    street?: string | null;
    street_type?: string | null;
    house?: string | null;
    block?: string | null;
    flat?: string | null;
    fias_id?: string | null;
    kladr_id?: string | null;
};

type DaDataOpf = {
    full?: string | null;
    short?: string | null;
};

type DaDataPartySuggestion = {
    value?: string;
    unrestricted_value?: string;
    data?: {
        inn?: string;
        kpp?: string | null;
        ogrn?: string | null;
        name?: {
            full_with_opf?: string | null;
            short_with_opf?: string | null;
            short?: string | null;
        } | null;
        opf?: DaDataOpf | null;
        address?: {
            value?: string | null;
            unrestricted_value?: string | null;
            data?: DaDataAddressData | null; // 👈 полная структура адреса
        } | null;
    } | null;
};

function mapOrganizationType(opf?: DaDataOpf | null, fallbackText = '') {
    const opfText = `${opf?.short ?? ''} ${opf?.full ?? ''} ${fallbackText}`.toLowerCase();

    if (opfText.includes('ип') || opfText.includes('индивидуальный предприниматель')) {
        return 'IP';
    }

    if (
        opfText.includes('ао') ||
        opfText.includes('акционерное общество') ||
        opfText.includes('пао') ||
        opfText.includes('оао') ||
        opfText.includes('зао')
    ) {
        return 'AO';
    }

    if (opfText.includes('ооо') || opfText.includes('общество с ограниченной ответственностью')) {
        return 'OOO';
    }

    return 'OTHER';
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const inn = searchParams.get('inn')?.replace(/\D/g, '') ?? '';

    if (inn.length < 3 || inn.length > 12) {
        return NextResponse.json(
            { error: 'ИНН должен содержать от 3 до 12 цифр' },
            { status: 400 },
        );
    }

    const apiKey = process.env.DADATA_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'Ключ API DaData не настроен' }, { status: 503 });
    }

    try {
        const response = await fetch(DADATA_PARTY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Token ${apiKey}`,
            },
            body: JSON.stringify({ query: inn, count: 5 }),
            cache: 'no-store',
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Не удалось получить организацию из DaData' },
                { status: response.status },
            );
        }

        const payload = (await response.json()) as {
            suggestions?: DaDataPartySuggestion[];
        };
        return NextResponse.json({
            organizations: (payload.suggestions ?? [])
                .filter((item) => item.data?.inn?.startsWith(inn))
                .map((item) => {
                    const addressData = item.data?.address?.data;
                    return {
                        inn: item.data?.inn ?? '',
                        fullName: item.data?.name?.full_with_opf ?? item.value ?? '',
                        shortName:
                            item.data?.name?.short_with_opf ??
                            item.data?.name?.short ??
                            item.value ??
                            '',
                        type: mapOrganizationType(
                            item.data?.opf,
                            `${item.data?.name?.full_with_opf ?? ''} ${item.data?.name?.short_with_opf ?? ''} ${item.value ?? ''}`,
                        ),
                        kpp: item.data?.kpp ?? '',
                        ogrn: item.data?.ogrn ?? '',
                        // Строковое представление адреса
                        legalAddress:
                            item.data?.address?.unrestricted_value ??
                            item.data?.address?.value ??
                            item.unrestricted_value ??
                            '',
                        // 👇 СТРУКТУРИРОВАННЫЙ АДРЕС (добавляем)
                        addressStructure: {
                            postalCode: addressData?.postal_code ?? null,
                            region: addressData?.region ?? null,
                            regionType: addressData?.region_type ?? null,
                            area: addressData?.area ?? null,
                            city: addressData?.city ?? '',
                            cityType: addressData?.city_type ?? null,
                            settlement: addressData?.settlement ?? null,
                            settlementType: addressData?.settlement_type ?? null,
                            street: addressData?.street ?? '',
                            streetType: addressData?.street_type ?? null,
                            house: addressData?.house ?? null,
                            block: addressData?.block ?? null,
                            flat: addressData?.flat ?? null,
                            fiasId: addressData?.fias_id ?? null,
                            kladrId: addressData?.kladr_id ?? null,
                        },
                    };
                }),
        });
    } catch {
        return NextResponse.json({ error: 'Failed to connect to DaData service' }, { status: 502 });
    }
}
