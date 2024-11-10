import * as React from "react";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const BannerCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className,
    )}
    {...props}
  />
));
BannerCard.displayName = "BannerCard";

const BannerCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6 relative", className)} 
    {...props}
  >
    <div className="absolute top-0 right-0 text-white px-20 py-20 rounded-bl-lg triangle-banner">
        <div className="absolute top-0 right-0">
            <Crown strokeWidth={3} size={36}>
            </Crown>
        </div>
    </div>
  </div>
));
BannerCardHeader.displayName = "BannerCardHeader";

const BannerCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
BannerCardTitle.displayName = "BannerCardTitle";

const BannerCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
BannerCardDescription.displayName = "BannerCardDescription";

const BannerCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
BannerCardContent.displayName = "BannerCardContent";

const BannerCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
BannerCardFooter.displayName = "BannerCardFooter";

export {
  BannerCard,
  BannerCardHeader,
  BannerCardFooter,
  BannerCardTitle,
  BannerCardDescription,
  BannerCardContent,
};
