// src/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="sign-in-wrapper">
      <SignIn 
        path="/sign-in"
        routing="path"
        forceRedirectUrl ="/admin/home" // Redirect to this URL after sign-in
      />
    </div>
  );
}
