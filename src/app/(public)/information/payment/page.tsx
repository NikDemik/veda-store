import PaymentPage from '@/components/pages/public/PaymentPage';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(
    'Оплата',
    'Условия оплаты заказов VEDA VFD: безналичная оплата по счёту, документы с НДС и порядок зачисления средств.',
);

export default function Payment() {
    return <PaymentPage />;
}
