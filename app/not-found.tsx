'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function NotFound() {
  useEffect(() => {
    // Log when this page is rendered to help with debugging
    console.log('404 page rendered', {
      path: window.location.pathname,
      url: window.location.href
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-4xl font-bold text-red-600 mb-4">404 - Page Not Found</h1>
      <p className="text-xl mb-8">The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.</p>
      <p className="text-gray-600 mb-6">Path: {typeof window !== 'undefined' ? window.location.pathname : ''}</p>
      <Link 
        href="/"
        className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
      >
        Go back home
      </Link>
    </div>
  );
}