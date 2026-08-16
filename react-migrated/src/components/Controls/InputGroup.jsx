import { twMerge } from 'tailwind-merge';

export const InputGroup = ({ label, id, children, className }) => {
    return (
        <div className={twMerge("space-y-1", className)}>
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-slate-700">
                    {label}
                </label>
            )}
            {children}
        </div>
    );
};

export const Input = ({ className, ...props }) => (
    <input
        className={twMerge("w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border", className)}
        {...props}
    />
);

export const Select = ({ className, children, ...props }) => (
    <select
        className={twMerge("w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border", className)}
        {...props}
    >
        {children}
    </select>
);
