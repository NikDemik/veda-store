'use client';

import { useState } from 'react';

const ArrowIcon = ({ size = 55, color = 'var(--accent)', hoverColor = 'var(--dark-accent)' }) => {
    const [isHovered, setIsHovered] = useState(false);
    const height = (size * 34) / 55;

    return (
        <svg
            className="shrink-0 transition-all duration-300 hover:scale-110"
            width={size}
            height={height}
            viewBox="0 0 55 34"
            fill="none"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <path
                d="M53.5 16.5936L39.0556 1.5M53.5 16.5936L39.0556 31.6872M53.5 16.5936H1.5"
                stroke={isHovered ? hoverColor : color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

// Использование
<ArrowIcon color="accent" hoverColor="red" />;

export default ArrowIcon;
