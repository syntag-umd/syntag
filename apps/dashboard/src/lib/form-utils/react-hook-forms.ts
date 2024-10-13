import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import { type UseFormProps, useForm } from "react-hook-form";
import { z } from "zod";

type UnwrapZodEffect<TType extends z.ZodType> =
  TType extends z.ZodEffects<infer U, any, any> ? U : TType;

/**
 * @example
 * type ObjectType = GetInput<typeof zfd.formdata(...)>;
 */
export type GetInput<TType extends z.ZodType> =
  UnwrapZodEffect<TType>["_input"];

/**
 * Instead of useForm from rhf, you can use this with zod-form-data.
 * Validates the FormData, but still uses object because of rhf
 */
export function useZodFormData<TSchema extends z.ZodType>(
  props: Omit<UseFormProps<GetInput<TSchema>>, "resolver"> & {
    schema: TSchema;
  },
) {
  const formRef = useRef<HTMLFormElement>(null);

  // zodResolver converts zod errors to react-hook-form errors
  const _resolver = zodResolver(props.schema, undefined, {
    raw: true,
  });

  // RESOLVER will return FormData
  const form = useForm<GetInput<TSchema>>({
    ...props,
    resolver: async (_, ctx, opts) => {
      if (!formRef.current) {
        return {
          values: {},
          errors: {
            root: {
              message: "Form not mounted",
            },
          },
        };
      }

      const values = new FormData(formRef.current);
      const r = _resolver(values, ctx, opts);

      return r;
    },
  });

  return { ...form, formRef };
}
