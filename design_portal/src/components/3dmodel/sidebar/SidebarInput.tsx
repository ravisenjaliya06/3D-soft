import React, { useEffect, useState } from 'react';

interface SidebarInputProps {
  value: number | string;
  onUpdate: (value: number) => void;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
  step?: number | string;
  type?: string;
  id?: string;
  name?: string;
}

const SidebarInput: React.FC<SidebarInputProps> = ({
  value,
  onUpdate,
  disabled,
  className,
  min,
  max,
  step,
  type = 'number',
  id,
  name,
}) => {
  const [localValue, setLocalValue] = useState<string | number>(value);

  // Synchronize local value when external value changes (e.g. selecting a new object)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    if (disabled) return;
    const numericValue = parseFloat(String(localValue));
    if (!isNaN(numericValue)) {
      let finalValue = numericValue;
      if (min !== undefined) finalValue = Math.max(min, finalValue);
      if (max !== undefined) finalValue = Math.min(max, finalValue);

      onUpdate(finalValue);
      setLocalValue(finalValue);
    } else {
      setLocalValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      id={id}
      name={name}
      type={type}
      min={min}
      max={max}
      step={step}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={className}
    />
  );
};

export default SidebarInput;
