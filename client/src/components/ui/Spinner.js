import React from "react";

const Spinner = React.forwardRef(
  ({ className = "", size = "default", color = "default", ...props }, ref) => {
    const baseStyles = "animate-spin rounded-full border-t-transparent";

    const sizeStyles = {
      sm: "h-4 w-4 border-2",
      default: "h-6 w-6 border-2",
      lg: "h-10 w-10 border-[3px]",
      xl: "h-16 w-16 border-4",
    };

    const colorStyles = {
      default: "border-primary-600",
      white: "border-white",
      gray: "border-gray-400",
    };

    const classes = `${baseStyles} ${sizeStyles[size]} ${colorStyles[color]} ${className}`;

    return <div ref={ref} className={classes} {...props} />;
  }
);

Spinner.displayName = "Spinner";

export default Spinner;
