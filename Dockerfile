# Stage 1: Build the application
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY biome.json ./

# Install dependencies using npm
RUN npm ci

COPY src ./src
COPY scripts ./scripts
COPY drizzle.config.ts ./drizzle.config.ts

RUN npm run build

# Stage 2: Run the application
FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# The .env file should be provided by the deployment environment
# or mounted as a volume for development. Do NOT copy it directly into the image.

EXPOSE 3000

CMD ["npm", "run", "start"]
