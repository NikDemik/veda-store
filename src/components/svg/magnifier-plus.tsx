'use client';

import { useState } from 'react';

const MagnifierPlus = ({ size = 30, color = 'var(--white)', hoverColor = 'var(--dark-accent)' }) => {
    const [isHovered, setIsHovered] = useState(false);
    const height = (size * 32) / 32;

    return (
        <svg
            className="shrink-0 transition-all duration-300 hover:scale-110"
            width={size}
            height={height}
            viewBox="0 0 32 32"
            fill="none"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <path
                d="M7.66667 12.6667H12.6667M12.6667 12.6667H17.6667M12.6667 12.6667V7.66667M12.6667 12.6667V17.6667M21 21L31 31M12.6667 24.3333C6.22334 24.3333 1 19.11 1 12.6667C1 6.22334 6.22334 1 12.6667 1C19.11 1 24.3333 6.22334 24.3333 12.6667C24.3333 19.11 19.11 24.3333 12.6667 24.3333Z"
                stroke={isHovered ? hoverColor : color}
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
    );
};

// Использование
<MagnifierPlus color="accent" hoverColor="red" />;

export default MagnifierPlus;
