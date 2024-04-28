# Builder stage
FROM node:20.12.0-alpine3.19 AS builder

WORKDIR /build

# Install dependencies using npm
COPY package*.json ./
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application code
COPY . ./

# Generate Prisma Client
RUN npx prisma generate
# Build the project
RUN npm run build

# Runner stage
FROM node:20.12.0-alpine3.19 AS runner

WORKDIR /app

# Copy built files from the builder stage
COPY --from=builder /build/dist/ ./dist/

# Copy Prisma schema and generated Prisma client
COPY --from=builder /build/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /build/prisma ./prisma

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install 

# Run Prisma migrations
RUN npx prisma migrate deploy

# Set the port the container will listen on
EXPOSE 6969

# Define the command to run the app
CMD ["npm", "start"]
