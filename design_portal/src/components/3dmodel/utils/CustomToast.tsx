import { FaCheck, FaExclamation } from 'react-icons/fa';

export const CustomToast = ({ appearance, message }: { appearance: string; message: string; closeToast?: () => void }) => {
  const isError = appearance === 'error';

  return (
    <div className="relative flex w-full items-center gap-[0.75rem] rounded-md !border !border-[#444] !bg-[#2C2C2C] px-[1rem] py-[0.8rem] !shadow-lg">
      {/* Icon */}
      <div
        className={`flex h-[1.5rem] w-[1.5rem] flex-shrink-0 items-center justify-center rounded-full ${isError ? '!bg-[#D32F2F]' : '!bg-[#4CAF50]'
          }`}
      >
        {isError ? (
          <FaExclamation className="text-[0.85rem] text-white" />
        ) : (
          <FaCheck className="text-[0.85rem] text-white" />
        )}
      </div>

      {/* Message */}
      <p className="flex-1 font-[poppins] text-[0.9rem] leading-[1.3rem] !break-words !whitespace-normal text-white">
        {message}
      </p>
    </div>
  );
};
