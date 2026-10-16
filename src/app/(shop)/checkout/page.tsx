import { Suspense } from 'react';
import { CheckoutPageView } from '@/components/checkout/checkout-page-view';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(
    'Оформление заказа',
    'Оформление заказа VEDA VFD с оплатой по выставленному счету.',
);

export default function CheckoutPage() {
    return (
        <Suspense fallback={null}>
            <CheckoutPageView />
        </Suspense>
    );
}
