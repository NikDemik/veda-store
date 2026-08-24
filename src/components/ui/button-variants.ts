import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
    'inline-flex shrink-0 items-center justify-center gap-2 bg-accent text-base leading-none whitespace-nowrap transition-all duration-300 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer disabled:opacity-60',
    {
        variants: {
            variant: {
                default:
                    'text-primary-foreground hover:bg-dark-accent dark:text-white dark:bg-dark-accent dark:hover:bg-accent',
                destructive:
                    'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
                outline:
                    'border border-dark-accent bg-transparent shadow-xs text-black dark:text-white hover:text-white hover:border-dark-accent hover:bg-dark-accent dark:border-input dark:bg-input/30 dark:hover:bg-input/50 dark:hover:text-white',
                secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                ghost: ' bg-grey hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
                link: 'text-primary underline-offset-4 hover:underline',
                footer: 'bg-transparent border border-grey text-grey',
            },
            size: {
                default: 'w-full h-14 px-8 py-5 has-[>svg]:px-8 rounded-[8px]',
                xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
                sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
                lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
                icon: 'size-12 rounded-full',
                'icon-xs': 'size-6 rounded-full',
                'icon-sm': 'size-8 rounded-full',
                'icon-lg': 'size-10 rounded-full',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);
