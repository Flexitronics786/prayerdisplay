import { Link } from "react-router-dom";
import React from "react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        <h1 className="text-4xl font-bold text-amber-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-amber-700 mb-2">Page Not Found</h2>
        <p className="text-amber-600 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link 
          to="/"
          className="inline-block bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-6 rounded-md transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
