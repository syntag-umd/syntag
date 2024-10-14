"use client";

import React, { useState } from "react";
import { InboxOutlined } from "@ant-design/icons";
import { Upload, message } from "antd";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { Button } from "~/components/ui/button";
import { api } from "~/server/trpc/clients/react";
import { cn } from "~/lib/utils";
import type { RcFile, UploadProps } from "antd/es/upload";

const { Dragger } = Upload;

interface UploadFileForm {
  files: RcFile[];
}

export default function FileUpload(props: {
  onUploadSuccess: (arg1: { knowledge_uuid: string }[]) => void;
  skipButton?: React.ReactNode;
}) {
  const utils = api.useUtils();
  const fileUpload = api.knowledge.ingestFiles.useMutation();
  const [loading, setLoading] = useState(false);

  const { handleSubmit, control, reset } = useForm<UploadFileForm>({
    defaultValues: { files: [] },
  });

  const onSubmit: SubmitHandler<UploadFileForm> = async (
    data: UploadFileForm,
  ) => {
    setLoading(true);
    try {
      const formData = new FormData();
      data.files.forEach((file) => {
        formData.append("files", file as File);
      });
      const new_knowledge = await fileUpload.mutateAsync(formData);
      void message.success(`All files uploaded successfully`);
      await utils.knowledge.invalidate();
      setTimeout(() => {
        props.onUploadSuccess(new_knowledge);
        reset();
      }, 250);
    } catch (e) {
      void message.error(`File upload failed`);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const draggableProps: UploadProps = {
    name: "file",
    multiple: true,
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`flex ${props.skipButton ? "mt-4 h-full justify-between" : "h-fit"} flex-col`}
    >
      <Controller
        name="files"
        control={control}
        render={({ field: { onChange, value } }) => {
          return (
            <Dragger
              {...draggableProps}
              className={cn(
                draggableProps.className,
                "max-h-[25vh] [&_.ant-upload-list]:max-h-[25vh] [&_.ant-upload-list]:pb-[10vh]",
              )}
              fileList={value}
              beforeUpload={(file, fileList) => {
                const newFileList = [...value, ...fileList];
                onChange(newFileList);
              }}
              onRemove={(removeFile) => {
                const index = value.findIndex(
                  (file) => file.uid === removeFile.uid,
                );
                const newFileList = value.slice();
                newFileList.splice(index, 1);
                onChange(newFileList);
              }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                Click or drag files to this area to upload
              </p>
              <p className="ant-upload-hint">Drag or drop your files here</p>
            </Dragger>
          );
        }}
      />
      {props.skipButton ? (
        <div className="flex w-full flex-col gap-2">
          <Button type="submit" disabled={loading} className="float-end">
            {loading ? "Uploading..." : "Upload"}
          </Button>
          {props.skipButton}
        </div>
      ) : (
        <Button type="submit" disabled={loading} className="float-end mt-3">
          {loading ? "Uploading..." : "Upload"}
        </Button>
      )}
    </form>
  );
}
