// app/components/Navigation.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  
  return (
    <nav className="p-4 bg-gray-100 mb-5">
      <div className="container mx-auto flex space-x-6">
        <Link href="/" className={`${pathname === '/' ? 'font-bold text-blue-600' : 'text-gray-800'}`}>
          Home
        </Link>
        <Link href="/dashboard" className={`${pathname === '/dashboard' ? 'font-bold text-blue-600' : 'text-gray-800'}`}>
          Dashboard
        </Link>
      </div>
    </nav>
  );
}