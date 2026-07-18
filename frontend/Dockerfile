# Dockerfile for React Frontend
# Stage 1: Build the React Application
FROM node:20-alpine AS build

WORKDIR /app

# Install package dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source files
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Serve the Build using Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy React production build to Nginx serving directory
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
