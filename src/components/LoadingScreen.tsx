
import React from "react";

const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-amber-100 to-amber-50">
      <div className="text-amber-800 text-xl animate-pulse">Loading...</div>
    </div>
  );
};

export default LoadingScreen;
