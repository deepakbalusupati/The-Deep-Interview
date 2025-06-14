import React from "react";

const BraintrustLogo = ({ size = "md", className = "" }) => {
  // Define size classes
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
    "2xl": "w-24 h-24",
  };

  const logoSize = sizeClasses[size] || sizeClasses.md;

  return (
    <svg
      viewBox="0 0 100 100"
      className={`text-indigo-500 ${logoSize} ${className}`}
      aria-label="Braintrust Logo"
    >
      <path
        fill="currentColor"
        d="M50,15 C65,15 75,25 75,40 C75,48 70,55 65,60 C70,65 75,72 75,80 C75,95 65,105 50,105 C35,105 25,95 25,80 C25,72 30,65 35,60 C30,55 25,48 25,40 C25,25 35,15 50,15 Z M50,25 C40,25 35,32 35,40 C35,48 40,55 50,55 C60,55 65,48 65,40 C65,32 60,25 50,25 Z M50,65 C40,65 35,72 35,80 C35,88 40,95 50,95 C60,95 65,88 65,80 C65,72 60,65 50,65 Z"
      />
    </svg>
  );
};

export default BraintrustLogo;
