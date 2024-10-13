import { repeatableOfType, zfd } from "zod-form-data";
import { z } from "zod";
import { type TypedFormData } from "./typed-form-data";

/**In FormData, you can have the same key many times.
 * This allows typing for a string
 * @example 
 * //show cases if there is an array expected
 * const t = zfd.formData({ arr: repeatableOfType(zfd.text()) });
type t = z.infer<typeof t>;
//Next line throws an the error.
type t2 = TypedFormData<t>;

type unwrapped = TransformFileStringArray<t>;

 */
export type TransformFileStringArray<T> = {
  [K in keyof T]: T[K] extends Array<infer U>
    ? U extends File | string
      ? U
      : never
    : T[K] extends File | string
      ? T[K]
      : never;
};

/**
 * input is passed into zfd.formData, creating a zod schema.
 * Adds typing to the FormData, instead of being generic.
 * input should only have zfd.text or zfd.file at root.
 * If a field is an array, don't worry about typing tbh. zfd can take an untyped FormData
 */
export function retypeZodFormData<T extends z.ZodRawShape>(input: T) {
  const bSchema = zfd.formData(input);
  type BSchema = z.output<typeof bSchema>;
  //type TypedForm = TypedFormData<TransformFileStringArray<BSchema>>;
  type TypedForm = TypedFormData<BSchema>;
  const formSchema = bSchema as z.ZodEffects<
    z.ZodObject<T>,
    z.output<z.ZodObject<T>>,
    TypedForm
  >;
  return formSchema;
}
