import { JobStatus } from "@syntag/db";

export interface ClientFile {
  knowledge_uuid: string;
  gcloud_name: string;
  displayName: string;
}

export interface ClientWebsite {
  knowledge_uuid: string;
  url: string;
  updatedAt: Date;
  status: JobStatus;
  error?: string;
}
