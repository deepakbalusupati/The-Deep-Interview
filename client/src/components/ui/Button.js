import React from "react";
import { Link } from "react-router-dom";

const Button = React.forwardRef(
  (
    {
      className,
      variant = "default",
      size = "default",
      as,
      href,
      to,
      children,
      ...props
    },
    ref
  ) => {
    const Component = as || (to ? Link : href ? "a" : "button");
    const linkProps = to ? { to } : href ? { href } : {};

    const baseStyles =
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

    const variantStyles = {
      default:
        "bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
      outline: "border border-gray-300 bg-transparent hover:bg-gray-50",
      ghost: "bg-transparent hover:bg-gray-100 text-gray-800",
      link: "underline-offset-4 hover:underline text-primary-600 p-0 bg-transparent",
      destructive: "bg-red-600 text-white hover:bg-red-700",
    };

    const sizeStyles = {
      default: "h-10 py-2 px-4",
      sm: "h-8 px-3 text-xs",
      lg: "h-12 px-6 text-base",
      icon: "h-10 w-10",
    };

    const classes = `${baseStyles} ${variantStyles[variant]} ${
      sizeStyles[size]
    } ${className || ""}`;

    return (
      <Component ref={ref} className={classes} {...linkProps} {...props}>
        {children}
      </Component>
    );
  }
);

Button.displayName = "Button";

export default Button;
