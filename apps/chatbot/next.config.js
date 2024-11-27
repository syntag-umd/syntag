/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "img.clerk.com",
        hostname: "upload.wikimedia.org"
      }
    ]
  }
}

module.exports = nextConfig
