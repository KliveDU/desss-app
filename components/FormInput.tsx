// components/FormInput.tsx
import React from 'react';

const FormInput: React.FC<{
  id: string;
  label: string;
  type: string;
  value: string | number | '';
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  icon: React.ReactNode;
  required?: boolean;
  helperText?: string;
}> = ({ id, label, type, value, onChange, icon, required = true, helperText }) => (
  <div className="relative mb-2">
    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
      {icon}
    </div>
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={onChange}
      className="block w-full rounded-md border-0 py-2.5 pl-10 bg-input-light dark:bg-input-dark text-text-light dark:text-text-dark ring-1 ring-inset ring-border-light dark:ring-border-dark placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-custom-blue sm:text-sm"
      placeholder={label}
      required={required && value === ''}
    />
    {helperText && (
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-10">{helperText}</p>
    )}
  </div>
);

export default FormInput;