"use client";

import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import './globals.css'
import { useEffect } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  
  return (
    
    <ClerkProvider>
      <html lang="en">
        <body>
          <header>
         
    
            
          </header>
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  )
}
