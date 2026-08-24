import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type LaunchOptions } from 'playwright';

export type InvoicePdfItem = {
    productSku: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    lineTotal: number;
};

export type InvoicePdfCompany = {
    fullName: string;
    shortName: string | null;
    inn: string;
    kpp: string | null;
    ogrn: string | null;
    legalAddress: string | null;
    actualAddress: string | null;
    postalAddress: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    directorName: string | null;
    accountantName: string | null;
    basis: string | null;
};

export type InvoicePdfBankAccount = {
    bankName: string;
    bankAddress: string | null;
    bik: string;
    checkingAccount: string;
    correspondentAccount: string;
    recipientName: string | null;
};

export type InvoicePdfData = {
    number: string;
    issuedAt: Date;
    dueAt: Date | null;
    orderNumber: string;
    seller: InvoicePdfCompany;
    sellerBankAccount: InvoicePdfBankAccount;
    buyer: {
        name: string;
        inn: string;
        kpp: string | null;
        email: string | null;
        phone: string | null;
        address: string | null;
    };
    items: InvoicePdfItem[];
    subtotal: number;
    vatTotal: number;
    grandTotal: number;
    currency: string;
};

let invoiceStampDataUrl: string | null = null;
let invoiceSignDataUrl: string | null = null;

export async function renderInvoicePdf(data: InvoicePdfData) {
    const browser = await launchInvoiceBrowser();

    try {
        const page = await browser.newPage({
            viewport: {
                width: 1240,
                height: 1754,
            },
        });
        const timeoutMs = getRenderTimeoutMs();

        page.setDefaultTimeout(timeoutMs);
        await page.setContent(renderInvoiceHtml(data), {
            waitUntil: 'load',
            timeout: timeoutMs,
        });
        await page.emulateMedia({ media: 'print' });

        return await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm',
            },
        });
    } finally {
        await browser.close();
    }
}

async function launchInvoiceBrowser(): Promise<Browser> {
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
    const launchOptions: LaunchOptions = {
        headless: true,
        args: ['--disable-dev-shm-usage'],
    };

    if (executablePath) {
        launchOptions.executablePath = executablePath;
    }

    if (process.env.PLAYWRIGHT_CHROMIUM_NO_SANDBOX !== 'false') {
        launchOptions.args = [...(launchOptions.args ?? []), '--no-sandbox'];
    }

    return chromium.launch(launchOptions);
}

function getRenderTimeoutMs() {
    const timeoutMs = Number(process.env.INVOICE_PDF_RENDER_TIMEOUT_MS);

    return Number.isFinite(timeoutMs) && timeoutMs >= 1000 ? timeoutMs : 30000;
}

function renderInvoiceHtml(data: InvoicePdfData) {
    const sellerName = data.seller.shortName || data.seller.fullName;
    const recipientName = data.sellerBankAccount.recipientName || sellerName;
    const sellerDetails = getCompanyDetails(data.seller);
    const buyerDetails = getBuyerDetails(data.buyer);
    const itemsHtml = data.items
        .map(
            (item, index) => `
                <tr>
                    <td class="center col-index">${index + 1}</td>
                    <td>
                        <div class="item-name">${escapeHtml(item.productName)}</div>
                    </td>
                    <td class="center col-code">${escapeHtml(item.productSku)}</td>
                    <td class="right col-qty">${formatQuantity(item.quantity)}</td>
                    <td class="center col-unit">шт.</td>
                    <td class="right col-price">${formatMoney(item.unitPrice)}</td>
                    <td class="right col-total">${formatMoney(item.lineTotal)}</td>
                </tr>
            `,
        )
        .join('');
    const stampDataUrl = getInvoiceStampDataUrl();
    const signDataUrl = getInvoiceSignDataUrl();

    return `<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8" />
    <title>Счет ${escapeHtml(data.number)}</title>
    <style>
        @page {
            size: A4;
            margin: 12mm 11mm;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            color: #000;
            background: #fff;
            font-family: Arial, "DejaVu Sans", "Liberation Sans", sans-serif;
            font-size: 11px;
            line-height: 1.28;
        }

        .page {
            width: 100%;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        .bank-table {
            border: 2px solid #000;
            table-layout: fixed;
        }

        .bank-table td {
            border: 1px solid #000;
            padding: 4px 6px;
            vertical-align: top;
        }

        .bank-label {
            font-size: 9px;
            line-height: 1.1;
            vertical-align: bottom;
        }

        .bank-title {
            height: 28px;
            font-weight: 700;
        }

        .bank-code {
            width: 44px;
            text-align: center;
        }

        .bank-value {
            width: 180px;
        }

        .headline {
            margin: 18px 0 8px;
            padding-bottom: 5px;
            border-bottom: 2px solid #000;
            font-size: 20px;
            font-weight: 700;
        }

        .meta {
            margin: 0 0 12px;
            color: #333;
        }

        .party {
            display: grid;
            grid-template-columns: 86px minmax(0, 1fr);
            gap: 8px;
            margin: 5px 0;
        }

        .party-label {
            font-weight: 700;
        }

        .party-value {
            font-weight: 700;
        }

        .party-details {
            margin-top: 2px;
            font-weight: 400;
        }

        .items {
            margin-top: 14px;
            border: 2px solid #000;
            page-break-inside: auto;
        }

        .items th,
        .items td {
            border: 1px solid #000;
            padding: 4px 5px;
            vertical-align: top;
        }

        .items th {
            text-align: center;
            font-weight: 700;
        }

        .center {
            text-align: center;
        }

        .right {
            text-align: right;
            white-space: nowrap;
        }

        .muted {
            color: #444;
            font-size: 9px;
        }

        .item-name {
            font-weight: 500;
        }

        .col-index {
            width: 28px;
        }

        .col-qty {
            width: 58px;
        }

        .col-unit {
            width: 42px;
        }

        .col-code {
            width: 82px;
        }

        .col-price,
        .col-total {
            width: 92px;
        }

        .totals {
            width: 310px;
            margin: 8px 0 0 auto;
        }

        .totals-row {
            display: grid;
            grid-template-columns: 1fr 110px;
            gap: 12px;
            margin-top: 2px;
            font-weight: 700;
        }

        .summary {
            margin-top: 12px;
            font-weight: 700;
        }

        .summary p {
            margin: 0 0 4px;
        }

        .payment-note {
            margin-top: 10px;
            color: #333;
            font-size: 10px;
        }

        .signatures {
            position: relative;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 34px;
            margin-top: 30px;
            min-height: 92px;
        }

        .signature-line {
            display: grid;
            grid-template-columns: auto minmax(120px, 1fr) minmax(120px, 1fr);
            gap: 8px;
            align-items: end;
            font-weight: 700;
        }

        .line {
            display: block;
            border-bottom: 1px solid #000;
            min-height: 18px;
        }

        .signature-slot {
            position: relative;
            display: block;
            min-height: 24px;
        }

        .signature-image {
            position: absolute;
            left: 50%;
            bottom: -2px;
            width: 96px;
            height: auto;
            transform: translateX(-50%);
            pointer-events: none;
        }

        .sign-name {
            display: block;
            text-align: center;
            border-bottom: 1px solid #000;
            min-height: 18px;
        }

        .caption {
            margin-top: 2px;
            color: #333;
            font-size: 9px;
            font-weight: 400;
            text-align: center;
        }

        .stamp {
            position: absolute;
            left: 295px;
            top: -44px;
            width: 188px;
            height: auto;
            opacity: 0.92;
            pointer-events: none;
        }
    </style>
</head>
<body>
    <main class="page">
        <table class="bank-table">
            <tr>
                <td colspan="2" class="bank-title">
                    ${escapeHtml(data.sellerBankAccount.bankName)}
                    ${data.sellerBankAccount.bankAddress ? `<div class="muted">${escapeHtml(data.sellerBankAccount.bankAddress)}</div>` : ''}
                </td>
                <td class="bank-code">БИК</td>
                <td class="bank-value">${escapeHtml(data.sellerBankAccount.bik)}</td>
            </tr>
            <tr>
                <td colspan="2" class="bank-label">Банк получателя</td>
                <td class="bank-code">Сч. №</td>
                <td class="bank-value">${escapeHtml(data.sellerBankAccount.correspondentAccount)}</td>
            </tr>
            <tr>
                <td style="width: 130px;">ИНН ${escapeHtml(data.seller.inn)}</td>
                <td style="width: 130px;">КПП ${escapeHtml(data.seller.kpp || '')}</td>
                <td class="bank-code" rowspan="3">Сч. №</td>
                <td class="bank-value" rowspan="3">${escapeHtml(data.sellerBankAccount.checkingAccount)}</td>
            </tr>
            <tr>
                <td colspan="2" class="bank-title">${escapeHtml(recipientName)}</td>
            </tr>
            <tr>
                <td colspan="2" class="bank-label">Получатель</td>
            </tr>
        </table>

        <h1 class="headline">Счет на оплату № ${escapeHtml(data.number)} от ${formatDate(data.issuedAt)} г.</h1>
        <p class="meta">Основание: заказ ${escapeHtml(data.orderNumber)}${data.dueAt ? `, оплатить до ${formatDate(data.dueAt)} г.` : ''}</p>

        <section class="party">
            <div class="party-label">Поставщик:</div>
            <div>
                <div class="party-value">${escapeHtml(sellerName)}</div>
                <div class="party-details">${escapeHtml(sellerDetails)}</div>
            </div>
        </section>

        <section class="party">
            <div class="party-label">Покупатель:</div>
            <div>
                <div class="party-value">${escapeHtml(data.buyer.name)}</div>
                <div class="party-details">${escapeHtml(buyerDetails)}</div>
            </div>
        </section>

        <table class="items">
            <thead>
                <tr>
                    <th class="col-index">№</th>
                    <th>Товары (работы, услуги)</th>
                    <th class="col-code">Код</th>
                    <th class="col-qty">Кол-во</th>
                    <th class="col-unit">Ед.</th>
                    <th class="col-price">Цена</th>
                    <th class="col-total">Сумма</th>
                </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
        </table>

        <section class="totals">
            <div class="totals-row">
                <span>Итого:</span>
                <span class="right">${formatMoney(data.subtotal)}</span>
            </div>
            <div class="totals-row">
                <span>В том числе НДС:</span>
                <span class="right">${formatMoney(data.vatTotal)}</span>
            </div>
            <div class="totals-row">
                <span>Всего к оплате:</span>
                <span class="right">${formatMoney(data.grandTotal)}</span>
            </div>
        </section>

        <section class="summary">
            <p>Всего наименований ${data.items.length}, на сумму ${formatMoney(data.grandTotal)} ${escapeHtml(data.currency)}</p>
            <p>${escapeHtml(capitalizeFirst(formatRublesInWords(data.grandTotal)))}</p>
        </section>

        <p class="payment-note">
            Оплата данного счета означает согласие с условиями поставки. Уведомление об оплате обязательно,
            в противном случае не гарантируется наличие товара на складе.
        </p>

        <section class="signatures">
            <img class="stamp" src="${stampDataUrl}" alt="" />
            <div>
                <div class="signature-line">
                    <span>Руководитель</span>
                    <span class="signature-slot">
                        <span class="line"></span>
                        <img class="signature-image" src="${signDataUrl}" alt="" />
                        <span class="caption">подпись</span>
                    </span>
                    <span>
                        <span class="sign-name">${escapeHtml(data.seller.accountantName || '')}</span>
                        <span class="caption">расшифровка подписи</span>
                    </span>
                </div>
            </div>
            <div>
                <div class="signature-line">
                    <span>Бухгалтер</span>
                    <span class="signature-slot">
                        <span class="line"></span>
                        <img class="signature-image" src="${signDataUrl}" alt="" />
                        <span class="caption">подпись</span>
                    </span>
                    <span>
                        <span class="sign-name">${escapeHtml(data.seller.accountantName || data.seller.directorName || '')}</span>
                        <span class="caption">расшифровка подписи</span>
                    </span>
                </div>
            </div>
        </section>
    </main>
</body>
</html>`;
}

function getCompanyDetails(company: InvoicePdfCompany) {
    return [
        `ИНН ${company.inn}`,
        company.kpp ? `КПП ${company.kpp}` : null,
        company.ogrn ? `ОГРН ${company.ogrn}` : null,
        company.legalAddress,
        company.phone ? `тел. ${company.phone}` : null,
        company.email,
    ]
        .filter(Boolean)
        .join(', ');
}

function getBuyerDetails(buyer: InvoicePdfData['buyer']) {
    return [
        `ИНН ${buyer.inn}`,
        buyer.kpp ? `КПП ${buyer.kpp}` : null,
        buyer.address,
        buyer.email,
        buyer.phone,
    ]
        .filter(Boolean)
        .join(', ');
}

function getInvoiceStampDataUrl() {
    if (invoiceStampDataUrl) {
        return invoiceStampDataUrl;
    }

    const stampPath = path.join(process.cwd(), 'public', 'img', 'invoice-stamp.png');
    const stamp = readFileSync(stampPath);
    invoiceStampDataUrl = `data:image/png;base64,${stamp.toString('base64')}`;

    return invoiceStampDataUrl;
}

function getInvoiceSignDataUrl() {
    if (invoiceSignDataUrl) {
        return invoiceSignDataUrl;
    }

    const signPath = path.join(process.cwd(), 'public', 'img', 'sign.png');
    const sign = readFileSync(signPath);
    invoiceSignDataUrl = `data:image/png;base64,${sign.toString('base64')}`;

    return invoiceSignDataUrl;
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDate(value: Date) {
    return new Intl.DateTimeFormat('ru-RU').format(value);
}

function formatQuantity(value: number) {
    return new Intl.NumberFormat('ru-RU', {
        maximumFractionDigits: 3,
    }).format(Number.isFinite(value) ? value : 0);
}

function formatMoney(value: number) {
    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
}

function formatRublesInWords(value: number) {
    const normalized = Number.isFinite(value) ? Math.max(0, value) : 0;
    const rubles = Math.floor(normalized);
    const kopecks = Math.round((normalized - rubles) * 100);

    return `${numberToRussianWords(rubles)} ${decline(rubles, ['рубль', 'рубля', 'рублей'])} ${kopecks
        .toString()
        .padStart(2, '0')} ${decline(kopecks, ['копейка', 'копейки', 'копеек'])}`;
}

function capitalizeFirst(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

const onesMale = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const onesFemale = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const teens = [
    'десять',
    'одиннадцать',
    'двенадцать',
    'тринадцать',
    'четырнадцать',
    'пятнадцать',
    'шестнадцать',
    'семнадцать',
    'восемнадцать',
    'девятнадцать',
];
const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

function numberToRussianWords(value: number) {
    if (value === 0) {
        return 'ноль';
    }

    const groups: Array<{ value: number; forms: [string, string, string]; female: boolean }> = [
        { value: value % 1000, forms: ['', '', ''], female: false },
        { value: Math.floor(value / 1000) % 1000, forms: ['тысяча', 'тысячи', 'тысяч'], female: true },
        { value: Math.floor(value / 1000000) % 1000, forms: ['миллион', 'миллиона', 'миллионов'], female: false },
        { value: Math.floor(value / 1000000000) % 1000, forms: ['миллиард', 'миллиарда', 'миллиардов'], female: false },
    ];

    return groups
        .map((group) => {
            if (group.value === 0) return '';

            const words = threeDigitsToWords(group.value, group.female);
            const form = group.forms[0] ? decline(group.value, group.forms) : '';

            return [words, form].filter(Boolean).join(' ');
        })
        .filter(Boolean)
        .reverse()
        .join(' ');
}

function threeDigitsToWords(value: number, female: boolean) {
    const result: string[] = [];
    const hundred = Math.floor(value / 100);
    const ten = Math.floor((value % 100) / 10);
    const one = value % 10;

    if (hundred > 0) {
        result.push(hundreds[hundred]);
    }

    if (ten === 1) {
        result.push(teens[one]);
    } else {
        if (ten > 1) {
            result.push(tens[ten]);
        }

        if (one > 0) {
            result.push((female ? onesFemale : onesMale)[one]);
        }
    }

    return result.join(' ');
}

function decline(value: number, forms: [string, string, string]) {
    const mod100 = Math.abs(value) % 100;
    const mod10 = Math.abs(value) % 10;

    if (mod100 >= 11 && mod100 <= 14) {
        return forms[2];
    }

    if (mod10 === 1) {
        return forms[0];
    }

    if (mod10 >= 2 && mod10 <= 4) {
        return forms[1];
    }

    return forms[2];
}
