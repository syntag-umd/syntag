import { z } from "zod";

export const createPaymentLinkInput = z.object({
  dollars: z.coerce.number().min(5, "Must be at least 5 dollars"),
});

export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkInput>;

export const updateAutoRechargeInput = z
  .object({
    threshold: z.coerce.number().gt(0, "Threshold must be greater than 0"),
    to: z.coerce.number().min(5, "Recharge to must be at least 5 dollars"),
    payment_method_id: z.string(),
  })
  .refine(
    (data) => {
      return data.to > data.threshold;
    },
    { message: "Recharge to must be greater than threshold", path: ["to"] },
  );

export type UpdateAutoRechargeInput = z.infer<typeof updateAutoRechargeInput>;
