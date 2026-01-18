FROM node:20-bookworm # Switching from slim to bookworm for better compatibility

# Install runtimes for the most common "runnable" languages
RUN apt-get update && apt-get install -y \
    # 1. C/C++ (Essential for many things)
    build-essential \
    # 2. Python & Tools
    python3 \
    python3-pip \
    python3-venv \
    # 3. Ruby (Scripting)
    ruby \
    # 4. PHP (Web Scripting)
    php-cli \
    # 5. Java (JVM - runs Java, Kotlin, Scala, etc.)
    default-jre-headless \
    # 6. Systems (Go & Rust - lightweight runtimes)
    golang-go \
    rustc \
    # 7. Others
    lua5.3 \
    perl \
    # 8. Your existing utilities
    ffmpeg \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip3 install --break-system-packages yt-dlp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p Downloads auth_session

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
