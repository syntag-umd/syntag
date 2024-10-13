# Use an official Node.js runtime as a parent image
FROM mcr.microsoft.com/playwright:v1.46.0

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json if available
COPY package*.json ./

# Install dependencies including Playwright and TypeScript
RUN npm install

# Install Playwright browsers (Chromium, Firefox, WebKit)
RUN npx playwright install chromium

# Copy the rest of the application code to the container
COPY . .

# Compile TypeScript to JavaScript
RUN npx tsc

# Set environment variables
ENV NODE_ENV=production

ENV PORT 3000
EXPOSE 3000

# Command to run the compiled application
CMD ["node", "dist/index.js"]
