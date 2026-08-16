import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

export const Button = ({ children, className, variant = 'primary', ...props }) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
        secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-blue-500",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
        ghost: "bg-transparent text-slate-600 hover:bg-slate-100"
    };

    return (
        <button
            className={twMerge(clsx(baseStyles, variants[variant], className))}
            {...props}
        >
            {children}
        </button>
    );
};
