import React, { useEffect, useState } from 'react';

interface SidebarInputWithSuffixProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'className'
> {
  wrapperClassName?: string;
  inputStyleCSS?: string;
  suffix?: string;
  suffixClassName?: string;
}

const SidebarInputWithSuffix: React.FC<SidebarInputWithSuffixProps> = ({
  wrapperClassName,
  inputStyleCSS,
  suffix,
  suffixClassName,
  value,
  onChange,
  onBlur,
  onKeyDown,
  ...inputProps
}) => {
  // Buffer the value locally so the 3D object is NOT updated on every keystroke
  const [localValue, setLocalValue] = useState<string | number | readonly string[] | undefined>(
    value
  );

  // Sync local state when external value changes (e.g. selecting a new object)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  /** Commit the buffered value by firing the original onChange */
  const commitValue = () => {
    if (onChange && localValue !== value) {
      // Construct a synthetic event-like object so existing onChange handlers work
      const syntheticEvent = {
        target: { value: String(localValue ?? '') },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    commitValue();
    onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue();
      e.currentTarget.blur();
    }
    onKeyDown?.(e);
  };

  return (
    <div className={wrapperClassName}>
      <input
        {...inputProps}
        className={inputStyleCSS}
        value={localValue ?? ''}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
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
