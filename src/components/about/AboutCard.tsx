'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { Award, PackageCheck, Truck, Handshake } from 'lucide-react';
import { aboutCards } from '@/data/about/aboutCards';

const iconComponents = { Award, PackageCheck, Truck, Handshake };

const spring = {
    type: 'spring' as const,
    stiffness: 110,
    damping: 20,
    mass: 1,
};

export default function AboutCard() {
    const [hovered, setHovered] = useState<number | null>(null);
    const [activeId, setActiveId] = useState(1);

    return (
        <section>
            <div className="flex flex-col gap-5 xl:flex-row">
                {aboutCards.map((card) => {
                    const active = activeId === card.id;
                    const Icon = iconComponents[card.iconName];

                    return (
                        <motion.article
                            key={card.id}
                            layout
                            onHoverStart={() => setActiveId(card.id)}
                            onHoverEnd={() => setActiveId(1)}
                            animate={{
                                flex: active ? 1.22 : 0.93,
                            }}
                            transition={{
                                layout: spring,
                                flex: spring,
                            }}
                            className="relative overflow-hidden rounded-xl shadow-xl dark:border dark:border-grey"
                        >
                            {/* Белый фон */}
                            <motion.div
                                className="absolute inset-0 bg-white dark:bg-neutral-900"
                                animate={{
                                    opacity: active ? 0 : 1,
                                }}
                                transition={{ duration: 0.35 }}
                            />

                            {/* Градиент */}
                            <motion.div
                                className="absolute inset-0 bg-linear-to-b from-accent via-white to-white dark:via-neutral-900 dark:to-neutral-900"
                                animate={{
                                    opacity: active ? 1 : 0,
                                }}
                                transition={{ duration: 0.35 }}
                            />

                            <motion.div
                                layout
                                transition={{ layout: spring }}
                                className="relative z-10 flex h-105 flex-col p-10"
                            >
                                {/* Номер */}
                                <motion.p
                                    layout
                                    transition={{ layout: spring }}
                                    animate={{
                                        color: active ? 'var(--black)' : 'var(--grey)',
                                    }}
                                    className="text-8xl font-semibold uppercase"
                                >
                                    {card.number}
                                </motion.p>

                                {/* Прижимает контент вниз */}
                                <div className="flex-1" />

                                {/* Блок иконка + заголовок */}
                                <motion.div
                                    layout
                                    transition={{ layout: spring }}
                                    className="flex flex-col gap-5"
                                >
                                    <motion.div
                                        layout
                                        transition={spring}
                                        animate={{
                                            scale: active ? 1.05 : 1,
                                            rotate: active ? 6 : 0,
                                        }}
                                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-grey"
                                    >
                                        <Icon size={24} className="text-dark-grey" />
                                    </motion.div>

                                    <motion.h3
                                        layout
                                        transition={{ layout: spring }}
                                        className="min-h-14 text-lg leading-6 font-medium"
                                    >
                                        {card.title}
                                    </motion.h3>
                                </motion.div>

                                {/* Описание */}
                                <AnimatePresence initial={false} mode="wait">
                                    {active && (
                                        <motion.div
                                            layout
                                            initial={{
                                                opacity: 0,
                                            }}
                                            animate={{
                                                opacity: 1,
                                            }}
                                            exit={{
                                                opacity: 0,
                                            }}
                                            transition={{
                                                opacity: {
                                                    duration: 0.25,
                                                },
                                                layout: spring,
                                            }}
                                            className="pt-5"
                                        >
                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                {card.description}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </motion.article>
                    );
                })}
            </div>
        </section>
    );
}
