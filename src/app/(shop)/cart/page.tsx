import { CartView } from '@/components/cart/cart-view';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(
    'Корзина',
    'Корзина товаров Anneng перед оформлением заказа.',
);

export default function CartPage() {
    return <CartView />;
}
