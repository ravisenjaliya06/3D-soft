import { FaCheck, FaExclamation } from 'react-icons/fa';

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
    <div className="relative flex w-full items-center gap-[0.75rem] bg-transparent px-[0.75rem] py-[0.5rem]">
      {/* Icon */}
      <div
        className={`flex h-[1.25rem] w-[1.25rem] flex-shrink-0 items-center justify-center rounded-full ${
          isError ? 'bg-red-500/20' : 'bg-green-500/20'
        }`}
      >
        {isError ? (
          <FaExclamation className="text-[0.65rem] text-red-500" />
        ) : (
          <FaCheck className="text-[0.65rem] text-green-500" />
        )}
      </div>

      {/* Message */}
      <p className="m-0 flex-1 font-[poppins] text-[0.75rem] leading-[1rem] font-medium tracking-wide text-gray-800">
        {message}
      </p>
    </div>
  );
};
