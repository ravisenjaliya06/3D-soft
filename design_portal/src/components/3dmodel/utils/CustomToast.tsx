
export const CustomToast = ({
    appearance,
    message,
}: {
    appearance: string;
    message: string;
    closeToast?: () => void;
}) => {
    const isError = appearance === 'error';

    return (
        <div className="relative flex h-[1rem] items-center gap-[0.75rem] px-[1rem] py-[0.6rem]">
            {/* Icon */}
            <div
                className={`flex h-[1.5rem] w-[1.5rem] items-center justify-center rounded-full ${isError ? 'bg-[#D32F2F]' : 'bg-[#FFA000]'
                    }`}
            >
                <span className="text-[0.85rem] font-bold text-white select-none">!</span>
            </div>

            {/* Message */}
            <p className="flex-1 truncate font-[poppins] text-[0.9rem] leading-[1.2rem] text-white">
                {message}
            </p>
        </div>
    );
};
