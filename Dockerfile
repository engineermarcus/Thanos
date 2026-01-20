# Switching from slim to bookworm for better compatibility
FROM node:20-bookworm

# Install runtimes and COMPILERS
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    ruby \
    php-cli \
    # Changed to JDK so you can compile (javac/kotlinc)
    default-jdk \ 
    # Adding Kotlin Compiler specifically
    kotlin \
    golang-go \
    rustc \
    lua5.3 \
    perl \
    ffmpeg \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip3 install --break-system-packages yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Create necessary directories for your bot
# NOTE: auth_session is now a BASE directory - multiple session folders will be created inside
RUN mkdir -p Downloads statuses temp_stickers

# Set proper permissions for dynamic session directory creation
RUN chmod -R 755 /app

EXPOSE 3000

# Health check to ensure container is running properly
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {let d=''; r.on('data', (c) => d+=c); r.on('end', () => {process.exit(JSON.parse(d).status === 'healthy' ? 0 : 1)})})" || exit 1

CMD ["npm", "start"]