import { forwardRef } from "react";

const variantClassNames = {
  primary:
    "border-[#061c16] bg-[#15332a] text-[#f3e1b4] focus-visible:outline-[#8b6e35]",
  secondary:
    "border-[#b8aa8f] bg-[#f8f5eb] text-[#55544d] focus-visible:outline-[#15332a]",
  danger:
    "border-[#7f3c29] bg-[#7f3c29] text-white focus-visible:outline-[#7f3c29]",
};

const FormActionButton = forwardRef(function FormActionButton(
  {
    className = "",
    type = "button",
    variant = "primary",
    ...buttonProps
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`min-h-11 rounded-lg border px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-70 ${variantClassNames[variant]} ${className}`}
      {...buttonProps}
    />
  );
});

export default FormActionButton;
