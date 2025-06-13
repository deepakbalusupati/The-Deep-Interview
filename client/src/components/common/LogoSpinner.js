import React from "react";
import logo from "../../assets/images/logo.svg";

const LogoSpinner = ({ size = "medium", showText = true }) => {
  const sizeClasses = {
    small: "h-8",
    medium: "h-16",
    large: "h-24",
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <img
        src={logo}
        alt="The Deep Interview Logo"
        className={`${sizeClasses[size]} w-auto mb-2`}
      />
      {showText && <p className="text-primary-600 font-medium">Loading...</p>}
    </div>
  );
};

export default LogoSpinner;
