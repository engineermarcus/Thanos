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
    default-jdk \ 
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
RUN mkdir -p Downloads auth_session statuses temp_stickers

EXPOSE 3000

CMD ["npm", "start"]