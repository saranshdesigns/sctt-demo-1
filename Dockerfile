FROM node:20

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies and build the frontend
RUN npm install
RUN npm run build

# Hugging Face Spaces run on port 7860
EXPOSE 7860
ENV PORT=7860

# Start the server
CMD ["npm", "start"]
