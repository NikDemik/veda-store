'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type ContactsFormValues = {
    name: string;
    phone: string;
    email: string;
    message: string;
    consent: boolean;
};

export default function ContactsForm() {
    const {
        control,
        formState: { errors, isSubmitting, isSubmitSuccessful, isValid },
        handleSubmit,
        register,
        reset,
    } = useForm<ContactsFormValues>({
        defaultValues: {
            name: '',
            phone: '',
            email: '',
            message: '',
            consent: false,
        },
        mode: 'onChange',
    });
    const [submitError, setSubmitError] = useState<string | null>(null);

    const onSubmit = async (values: ContactsFormValues) => {
        setSubmitError(null);

        const response = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...values,
                source: 'contacts',
            }),
        });
        const result = (await response.json()) as { error?: string };

        if (!response.ok) {
            setSubmitError(result.error || 'Не удалось отправить заявку.');
            return;
        }

        reset();
    };

    return (
        <form
            className="relative z-10 flex w-full max-w-xl flex-col gap-5"
            onSubmit={handleSubmit(onSubmit)}
        >
            <div className="space-y-2">
                <label className="block text-sm font-medium text-white" htmlFor="contacts-name">
                    Как к вам обращаться?
                </label>
                <input
                    id="contacts-name"
                    className={cn(
                        'h-12 w-full border-b border-dark-grey bg-transparent px-4 text-base text-grey outline-none transition focus:border-accent focus:ring-2 focus:ring-dark-grey',
                        errors.name &&
                            'border-destructive focus:border-destructive focus:ring-destructive/30',
                    )}
                    placeholder="Введите здесь"
                    {...register('name', {
                        required: 'Укажите, как к вам обращаться',
                    })}
                />
                {errors.name && <p className="text-sm text-white/80">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-white" htmlFor="contacts-phone">
                    Номер телефона:
                </label>
                <input
                    id="contacts-phone"
                    className={cn(
                        'h-12 w-full border-b border-dark-grey bg-transparent px-4 text-base text-grey outline-none transition focus:border-accent focus:ring-2 focus:ring-dark-grey',
                        errors.phone &&
                            'border-destructive focus:border-destructive focus:ring-destructive/30',
                    )}
                    inputMode="tel"
                    placeholder="+7 (___) ___-__-__"
                    type="tel"
                    {...register('phone', {
                        required: 'Укажите номер телефона',
                        minLength: {
                            value: 6,
                            message: 'Проверьте номер телефона',
                        },
                    })}
                />
                {errors.phone && <p className="text-sm text-white/80">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-white" htmlFor="contacts-email">
                    Email:
                </label>
                <input
                    id="contacts-email"
                    className={cn(
                        'h-12 w-full border-b border-dark-grey bg-transparent px-4 text-base text-grey outline-none transition focus:border-accent focus:ring-2 focus:ring-dark-grey',
                        errors.email &&
                            'border-destructive focus:border-destructive focus:ring-destructive/30',
                    )}
                    inputMode="email"
                    placeholder="name@company.ru"
                    type="email"
                    {...register('email', {
                        required: 'Укажите email',
                        pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: 'Проверьте email',
                        },
                    })}
                />
                {errors.email && <p className="text-sm text-white/80">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-white" htmlFor="contacts-message">
                    Сообщение:
                </label>
                <textarea
                    id="contacts-message"
                    className="min-h-24 w-full resize-y border-b border-dark-grey bg-transparent px-4 py-3 text-base text-grey outline-none transition focus:border-accent focus:ring-2 focus:ring-dark-grey"
                    placeholder="Кратко опишите вопрос"
                    {...register('message')}
                />
            </div>

            <Controller
                control={control}
                name="consent"
                rules={{
                    validate: (value) =>
                        value || 'Необходимо согласие на обработку персональных данных',
                }}
                render={({ field }) => (
                    <div className="space-y-2">
                        <label
                            className="flex items-start gap-3 text-sm leading-5 text-white"
                            htmlFor="contacts-consent"
                        >
                            <Checkbox
                                id="contacts-consent"
                                checked={field.value}
                                className="mt-0.5 border-white bg-white text-dark-accent data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-dark-accent"
                                onBlur={field.onBlur}
                                onCheckedChange={(checked) => field.onChange(checked === true)}
                            />
                            <span>Я даю согласие на обработку персональных данных</span>
                        </label>
                        {errors.consent && (
                            <p className="text-sm text-white/80">{errors.consent.message}</p>
                        )}
                    </div>
                )}
            />

            <Button
                className="max-w-72 bg-accent hover:bg-white hover:text-black focus:bg-accent/90 disabled:pointer-events-none disabled:opacity-50"
                disabled={isSubmitting || !isValid}
                type="submit"
            >
                Заказать звонок
            </Button>

            {isSubmitSuccessful && (
                <p className="text-sm text-white/80">Заявка отправлена.</p>
            )}
            {submitError ? (
                <p className="text-sm text-white/80">{submitError}</p>
            ) : null}
        </form>
    );
}
