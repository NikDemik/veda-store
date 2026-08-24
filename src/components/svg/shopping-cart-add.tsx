'use client';

import { useState } from 'react';

const ShoppingCartAddIcon = ({
    size = 60,
    color = 'var(--accent)',
    hoverColor = 'var(--dark-accent)',
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const height = (size * 40) / 60;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <path
                d="M8 22C8.55228 22 9 21.5523 9 21C9 20.4477 8.55228 20 8 20C7.44772 20 7 20.4477 7 21C7 21.5523 7.44772 22 8 22Z"
                stroke={isHovered ? hoverColor : color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M19 22C19.5523 22 20 21.5523 20 21C20 20.4477 19.5523 20 19 20C18.4477 20 18 20.4477 18 21C18 21.5523 18.4477 22 19 22Z"
                stroke={isHovered ? hoverColor : color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M2.05078 2.0498H4.05078L6.71078 14.4698C6.80836 14.9247 7.06145 15.3313 7.42649 15.6197C7.79153 15.908 8.24569 16.0602 8.71078 16.0498H18.4908C18.946 16.0491 19.3873 15.8931 19.7418 15.6076C20.0964 15.3222 20.3429 14.9243 20.4408 14.4798L22.0908 7.0498"
                stroke={isHovered ? hoverColor : color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M13.75 2.75V10.75M17.75 6.75H9.75"
                stroke={isHovered ? hoverColor : color}
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
};

// Использование
{
    /* <ShoppingCartAddIcon color="accent" hoverColor="red" />; */
}

export default ShoppingCartAddIcon;
