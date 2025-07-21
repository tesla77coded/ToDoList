# Node.js Base Image
FROM node:18-alpine

# Working directory
WORKDIR /app

# Copying dependency files
Copy package*.json ./

# Install dependencies
RUN npm install

# Copy project
COPY . .

# PORT
EXPOSE 8080

# Start app
CMD ["npm", "start"]
