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
          isError ? 'bg-[var(--bv-danger-soft)]' : 'bg-[var(--bv-success-soft)]'
        }`}
      >
        {isError ? (
          <FaExclamation className="text-[0.65rem] text-[var(--bv-danger)]" />
        ) : (
          <FaCheck className="text-[0.65rem] text-[var(--bv-success)]" />
        )}
      </div>

      {/* Message */}
      <p className="m-0 flex-1 font-[family-name:var(--bv-font)] text-[0.8rem] leading-[1.1rem] font-semibold text-[var(--bv-text)]">
        {message}
      </p>
    </div>
  );
};
