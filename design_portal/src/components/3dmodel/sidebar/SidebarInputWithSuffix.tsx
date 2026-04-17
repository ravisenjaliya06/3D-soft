import React from 'react';

interface SidebarInputWithSuffixProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  wrapperClassName?: string;
  inputClassName?: string;
  suffix?: string;
  suffixClassName?: string;
}

const SidebarInputWithSuffix: React.FC<SidebarInputWithSuffixProps> = ({
  wrapperClassName,
  inputClassName,
  suffix,
  suffixClassName,
  ...inputProps
}) => {
  return (
    <div className={wrapperClassName}>
      <input {...inputProps} className={inputClassName} />
      {suffix ? (
        <span
          className={
            suffixClassName ??
            'pointer-events-none absolute top-1/2 right-[0.25rem] -translate-y-1/2 text-[0.65rem] text-[var(--border-color)]'
          }
        >
          {suffix}
        </span>
      ) : null}
    </div>
  );
};

export default SidebarInputWithSuffix;
