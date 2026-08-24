const currencySymbols = {
    RUB: '₽',
    USD: '$',
    EUR: '€',
};

function currencyFormat(currency: keyof typeof currencySymbols) {
    const symbol = currencySymbols[currency] || '₽';
    return `${symbol}`;
}
export default currencyFormat;
