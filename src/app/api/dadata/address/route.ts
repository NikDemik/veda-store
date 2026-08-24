import { NextResponse } from 'next/server';

const DADATA_ADDRESS_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address';

type DaDataAddressSuggestion = {
    value?: string;
    unrestricted_value?: string;
    data?: {
        country_iso_code?: string | null;
        postal_code?: string | null;
        region?: string | null;
        region_type?: string | null;
        area?: string | null;
        area_type?: string | null;
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
    } | null;
};

function formatWithType(value?: string | null, type?: string | null) {
    const normalizedValue = value?.trim();
    const normalizedType = type?.trim();

    if (!normalizedValue) {
        return null;
    }

    return normalizedType ? `${normalizedType} ${normalizedValue}` : normalizedValue;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim() ?? '';

    if (query.length < 3) {
        return NextResponse.json(
            { error: 'Адресный запрос должен содержать не менее 3 символов' },
            { status: 400 },
        );
    }

    const apiKey = process.env.DADATA_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'Ключ API DaData не настроен' }, { status: 503 });
    }

    try {
        const response = await fetch(DADATA_ADDRESS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Token ${apiKey}`,
            },
            body: JSON.stringify({
                query,
                count: 5,
                locations: [{ country_iso_code: 'RU' }],
            }),
            cache: 'no-store',
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Не удалось получить предложения адресов от DaData' },
                { status: response.status },
            );
        }

        const payload = (await response.json()) as {
            suggestions?: DaDataAddressSuggestion[];
        };

        return NextResponse.json({
            suggestions: (payload.suggestions ?? []).map((item) => {
                const addressData = item.data;
                const city =
                    formatWithType(addressData?.city, addressData?.city_type) ??
                    formatWithType(addressData?.settlement, addressData?.settlement_type) ??
                    formatWithType(addressData?.area, addressData?.area_type) ??
                    '';
                const street =
                    formatWithType(addressData?.street, addressData?.street_type) ?? city;

                return {
                    value: item.value ?? item.unrestricted_value ?? '',
                    unrestrictedValue: item.unrestricted_value ?? item.value ?? '',
                    data: {
                        country: addressData?.country_iso_code ?? 'RU',
                        postalCode: addressData?.postal_code ?? null,
                        region: formatWithType(addressData?.region, addressData?.region_type),
                        city,
                        street,
                        house: addressData?.house ?? null,
                        building: addressData?.block ?? null,
                        flat: addressData?.flat ?? null,
                        fiasId: addressData?.fias_id ?? null,
                        kladrId: addressData?.kladr_id ?? null,
                    },
                };
            }),
        });
    } catch {
        return NextResponse.json(
            { error: 'Не удалось подключиться к сервису адресов DaData' },
            { status: 502 },
        );
    }
}
