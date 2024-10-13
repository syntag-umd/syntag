import { Storage } from "@google-cloud/storage";
import { Readable } from "stream";
import { type ReadableStream } from "stream/web";
import { env } from "../../env";

export const storage = new Storage({
    credentials: {
        client_email: env.GC_SERVICE_EMAIL,
        private_key: env.GC_SERVICE_PRIVATE_KEY,
    },
});

export async function getSignedUrl(filename: string) {
    const options = {
        version: "v4" as const,
        action: "read" as const,
        expires: Date.now() + 60 * 60 * 1000,
    };

    const file = storage.bucket(env.GC_BUCKET_NAME).file(filename);
    const [url] = await file.getSignedUrl(options);
    return url;
}

export async function uploadFileGC(
    bucket: string,
    filename: string,
    file: File
) {
    const gcBucket = storage.bucket(bucket);
    const gcFile = gcBucket.file(filename);
    const stream = gcFile.createWriteStream();

    const nodeReadableStream = Readable.fromWeb(
        file.stream() as ReadableStream
    );

    nodeReadableStream.pipe(stream);
    const uploadPromise = new Promise<{ error: any } | { filename: string }>(
        (resolve, reject) => {
            stream.on("finish", () => {
                resolve({ filename });
            });
            stream.on("error", (err) => {
                console.error(`Error uploading file ${filename}:`, err);
                reject({ error: err });
            });
        }
    );

    return uploadPromise;
}

/** Uploads a base64 string as a proper file */
export async function uploadBase64(filename: string, base64Mime: string) {
    const matches = base64Mime.match(/^data:(.+?);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        throw new Error("Invalid input string");
    }

    const mimeType = matches[1];
    const pureBase64Data = matches[2]!;
    const buffer = Buffer.from(pureBase64Data, "base64");
    const bucket = storage.bucket(env.GC_BUCKET_NAME);
    const file = bucket.file(filename);
    await file.save(buffer, {
        metadata: {
            contentType: mimeType,
        },
    });
    return true;
}
export interface SecureDoc {
    filename: string;
    name: string;
    url: string;
}

export async function getSecureDocs(prefixEndSlash: string) {
    const [files] = await storage.bucket(env.GC_BUCKET_NAME).getFiles({
        prefix: prefixEndSlash,
    });
    const secureDocs: SecureDoc[] = await Promise.all(
        files
            .filter((file) => file.name !== prefixEndSlash)
            .map(async (file, index) => {
                const url = await getSignedUrl(file.name);
                const doc: SecureDoc = {
                    filename: file.name,
                    name: file.name.split("/").pop() ?? `File ${index + 1}`,
                    url: url,
                };
                return doc;
            })
    );
    return secureDocs;
}

export async function getSignedUrlUpload(
    filename: string,
    action: "write" | "read"
) {
    const options = {
        version: "v4" as const,
        action: action,
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    const [url] = await storage
        .bucket(env.GC_BUCKET_NAME)
        .file(filename)
        .getSignedUrl(options);

    return url;
}

export function getFileStream(filename: string) {
    const file = storage.bucket(env.GC_BUCKET_NAME).file(filename);
    return file.createReadStream();
}

export function deleteGCUserFiles(userUuid: string) {
    const bucket = storage.bucket(env.GC_BUCKET_NAME);
    const prefix = `users/${userUuid}/`;
    return bucket.deleteFiles({ prefix });
}
