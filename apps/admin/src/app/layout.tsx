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
          {/*Based on Clerk set up tutorial
            Modification:
            No buttons: 
            -Sign button isn't required when loading the page
            -Logout Button is put in app/page.tsx so it aligns better with the page
          */}
          </header>
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  )
}
