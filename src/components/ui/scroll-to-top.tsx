'use client';

import { useState, useEffect } from 'react';
import { MoveUp } from 'lucide-react';

export default function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    // Отслеживаем прокрутку
    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 400) {
                // Показываем после 400px прокрутки
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    // Функция плавного скролла наверх
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth', // плавность прокрутки
        });
    };

    return (
        <>
            {isVisible && (
                <button
                    onClick={scrollToTop}
                    aria-label="Scroll to top" // Для доступности
                    className="fixed bottom-6 right-6 p-3 bg-accent text-white rounded-full shadow-lg hover:bg-dark-accent transition-opacity focus:outline-none focus:ring-2 focus:ring-accent-400 z-50"
                >
                    <MoveUp size={18} aria-hidden="true" />
                </button>
            )}
        </>
    );
}
