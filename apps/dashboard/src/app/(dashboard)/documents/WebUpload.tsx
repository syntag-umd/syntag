import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  type IngestWebsiteInput,
  ingestWebsiteSchema,
} from "~/features/knowledge/types";
import { api } from "~/server/trpc/clients/react";
import { useState } from "react";
import { Switch } from "~/components/ui/switch";

export default function WebUpload({
  onUploadSuccess,
}: {
  onUploadSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const apiUtils = api.useUtils();
  const ingestWebMutation = api.knowledge.ingestWebsite.useMutation();
  const form = useForm<IngestWebsiteInput>({
    resolver: zodResolver(ingestWebsiteSchema),
    defaultValues: {
      url: "",
      crawl: true,
    },
  });

  const onSubmit = async (values: IngestWebsiteInput) => {
    setLoading(true);
    console.log(values);
    try {
      const md = await ingestWebMutation.mutateAsync(values);
      apiUtils.knowledge.getClientWebsites.setData(void 0, md);
      console.log(md);
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } finally {
      setLoading(false);
    }
  };
  const crawlState = form.watch("crawl");
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex min-h-[208px] flex-col justify-between gap-4"
      >
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{`${crawlState ? "URLs that start with" : "Website URL"}`}</FormLabel>
                <FormControl>
                  <Input
                    className="rounded-lg bg-card"
                    placeholder="https://www.example.com"
                    {...field}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="crawl"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Automatically Crawl</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </div>
                <FormDescription>
                  URLs found that start with the inputted text are also uploaded
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button className="self-end" disabled={loading} type="submit">
          Upload
        </Button>
      </form>
    </Form>
  );
}
