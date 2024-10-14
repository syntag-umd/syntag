export const env = {
    GC_SERVICE_EMAIL: process.env.GC_SERVICE_EMAIL,
    GC_SERVICE_PRIVATE_KEY: process.env.GC_SERVICE_PRIVATE_KEY.replace(
        /\\n/g,
        "\n"
    ),
    GC_BUCKET_NAME: process.env.GC_BUCKET_NAME,
};
