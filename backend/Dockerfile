# Dockerfile for Node.js Express Backend
FROM node:20

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose backend port
EXPOSE 5000

# Run server
CMD ["npm", "start"]
