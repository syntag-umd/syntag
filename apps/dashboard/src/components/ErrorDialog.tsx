/**
 * v0 by Vercel.
 * @see https://v0.dev/t/Xwkjsl2GDWW
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import { Button } from "@/components/ui/button";
import {
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogContent,
  Dialog,
  DialogOverlay,
} from "@/components/ui/dialog";
import Link from "./ui/Link";

export const KnownErrors = {
  stripe: {
    no_payment_method:
      "This customer has no attached payment source or default payment method. Please consider adding a default payment method. For more information, visit https://stripe.com/docs/billing/subscriptions/payment-methods-setting#payment-method-priority.",
  },
};
export function StripeNoPaymentMethod({
  redirect_path,
}: {
  redirect_path?: string;
}) {
  return (
    <DialogDescription className="whitespace-normal text-wrap text-lg">
      You do not have a payment method set up.{" "}
      <Link
        href={
          "/settings/billing" +
          (redirect_path ? `?redirect_path=${redirect_path}` : "")
        }
        target="_blank"
      >
        Add a payment method
      </Link>
    </DialogDescription>
  );
}

export default function ErrorDialog(props: {
  setError: (error: Error | undefined) => void;
  error: Error | undefined;
  metadata?: { redirect_path?: string };
}) {
  const setOpen = (open: boolean) => {
    if (!open) {
      props.setError(undefined);
    } else {
      props.setError(props.error);
    }
  };

  let Message;
  if (props.error) {
    switch (props.error.message) {
      case KnownErrors.stripe.no_payment_method:
        Message = (
          <StripeNoPaymentMethod
            redirect_path={props.metadata?.redirect_path}
          />
        );
        break;
      default:
        Message = (
          <DialogDescription className="whitespace-normal text-wrap text-lg">
            {props.error.message}
          </DialogDescription>
        );
        break;
    }
  }

  return (
    <Dialog open={typeof props.error !== "undefined"} onOpenChange={setOpen}>
      <DialogOverlay className="z-[9999]" />
      <DialogContent className="z-[10000] p-0 sm:max-w-[425px]">
        <div className="box-border p-6 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">
              Error
            </DialogTitle>
            <div style={{ marginBottom: "0.5rem" }}>{Message}</div>
          </DialogHeader>
          <Button
            variant={"outline"}
            onClick={() => setOpen(false)}
            className="w-full border-foreground"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
