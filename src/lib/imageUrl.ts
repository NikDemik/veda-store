export const getSafeImageUrl = (imageUrl: string | null): string => {
    return imageUrl || '/img/placeholder-product.png';
};
