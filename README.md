
<h1 align="center">THANOS MD BOT</h1>

<div align="center">

<img src="https://files.catbox.moe/lj7hb0.jpeg" alt="Thanos" 
     style="width: 100%; height: 100%; object-fit: cover; object-position: center 20%; 
            border-radius: 8px; filter: contrast(1.1) brightness(0.8) saturate(1.2); 
            box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1);">

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=28&duration=3000&pause=1000&color=9D00FF&center=true&vCenter=true&width=600&lines=Dread+It.+Run+From+It.;Destiny+Arrives+All+The+Same" alt="Typing SVG" />

---

[![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)](https://github.com)
[![Node](https://img.shields.io/badge/Node-v18+-green?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

---

## 📖 OVERVIEW

**THANOS MD** is an advanced WhatsApp bot powered by AI, featuring intelligent conversation handling, group management, and robust anti-spam protection. The bot uses Baileys library for WhatsApp Web connectivity and stores authentication sessions securely in MongoDB Atlas for persistent connections across deployments.

### 🎯 Key Capabilities

- **AI-Powered Conversations**: Natural language processing with context-aware responses
- **Persistent Sessions**: MongoDB-backed authentication that survives restarts
- **Group Protection**: Advanced spam detection, link filtering, and bot detection
- **Smart Moderation**: Automatic muting system with configurable timeframes
- **Zero Downtime**: Graceful shutdown handling for seamless deployments
- **Multi-Platform**: Deploy on Render, Heroku, VPS, or even Termux

---

## ✨ CORE FEATURES

### 🤖 AI Intelligence
- Conversational AI with memory across messages
- Context-aware responses in both private and group chats
- Responds to replies in groups (natural flow)
- Customizable personality and response style

### 🛡️ Group Management
- **Spam Detection**: Automatically detects and removes spam messages (configurable character limit)
- **Link Protection**: Blocks unauthorized links with warning system
- **Bot Detection**: Identifies and permanently mutes bot accounts
- **Smart Muting**: Temporary mutes with automatic unmute
- **Admin Immunity**: Admins are exempt from all restrictions
- **Blacklist Command**: Scan and clean entire chat history

### ⚙️ Bot Control
- `chat` / `type` - Activate Thanos AI
- `zip` / `shut up` / `sleep` - Deactivate AI
- `menu` - Display control panel
- `groupcontrol on/off` - Toggle protection features
- `groupstatus` - Check current bot status
- `ping` - Test bot responsiveness

### 🔧 Moderation Commands
- `blacklist` - Scan chat history for spam
- `banned` - List all banned users
- `muted` - Show temporarily muted users
- `unban @user` - Remove user from banlist
- `checkban @user` - Check if user is banned

---

## 🚀 INSTALLATION

### Prerequisites
- Node.js v18 or higher
- MongoDB Atlas account (free tier works)
- WhatsApp account

### Quick Setup

1. **Clone Repository**
```bash
git clone https://github.com/neimantech1/Thanos.git
cd Thanos
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment**
Create a `.env` file in the root directory:
```env
MONGO_URI=your_mongodb_atlas_connection_string
PORT=3000
DB_NAME=thanos
THANOS=yes
GROUP_CONTROL=yes
```

4. **Start Bot**
```bash
npm start
```

---

## 🔗 CONNECTING YOUR WHATSAPP

The bot provides a web interface for authentication at `http://localhost:3000` (or your deployment URL).

### Method 1: QR Code (Recommended)

1. Open the web interface in your browser
2. Click on **"QR Code"** tab
3. Open WhatsApp on your phone
4. Go to **Settings → Linked Devices → Link a Device**
5. Scan the QR code displayed on the web interface
6. Wait for confirmation

### Method 2: Pairing Code

1. Open the web interface
2. Click on **"Phone Number"** tab
3. Enter your phone number with country code (e.g., `254712345678`)
4. Click **"Generate Code"**
5. Copy the 8-digit pairing code displayed
6. Open WhatsApp on your phone
7. Go to **Settings → Linked Devices → Link a Device**
8. Tap **"Link with phone number instead"**
9. Enter your country and phone number
10. Input the pairing code from the web interface
11. Wait for connection confirmation

### Connection Features
- **Auto-Reconnect**: Bot automatically reconnects if disconnected
- **Session Persistence**: Login survives restarts and redeployments
- **Real-time Status**: Web interface shows connection status
- **Secure Storage**: Sessions encrypted in MongoDB

---

## ☁️ DEPLOYMENT GUIDES

### 🔷 Render (Recommended)

**Why Render?**
- Free tier available
- Auto-deployment from GitHub
- Built-in health checks
- Zero-config SSL

**Steps:**

1. **Fork Repository**
   - Fork this repo to your GitHub account

2. **Create MongoDB Atlas Database**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create free cluster
   - Create database user
   - Get connection string (looks like: `mongodb+srv://user:pass@cluster.mongodb.net/`)

3. **Deploy on Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click **"New +"** → **"Web Service"**
   - Connect your forked repository
   - Configure:
     - **Name**: `thanos-bot` (or your choice)
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `node app.js`
     - **Plan**: Free (or paid for better performance)

4. **Add Environment Variables**
   - Click **"Environment"** tab
   - Add these variables:
     ```
     MONGO_URI = your_mongodb_connection_string
     PORT = 3000
     DB_NAME = thanos
     THANOS = yes
     GROUP_CONTROL = yes
     ```

5. **Deploy**
   - Click **"Create Web Service"**
   - Wait for build to complete
   - Access your bot at the provided URL
   - Open the URL in browser to connect WhatsApp

**Important Notes:**
- Free tier sleeps after 15 minutes of inactivity
- Use paid plan ($7/month) for 24/7 uptime
- Enable **"Auto-Deploy"** for automatic updates

---

### 🟣 Heroku

**Steps:**

1. **Install Heroku CLI**
```bash
npm install -g heroku
heroku login
```

2. **Create Heroku App**
```bash
heroku create thanos-whatsapp-bot
```

3. **Add MongoDB Add-on**
```bash
heroku addons:create mongolab:sandbox
```

Or set your own MongoDB URI:
```bash
heroku config:set MONGO_URI="your_connection_string"
```

4. **Set Environment Variables**
```bash
heroku config:set DB_NAME=thanos
heroku config:set THANOS=yes
heroku config:set GROUP_CONTROL=yes
```

5. **Deploy**
```bash
git push heroku main
```

6. **Open App**
```bash
heroku open
```

7. **View Logs**
```bash
heroku logs --tail
```

**Tips:**
- Use hobby dynos ($7/month) to prevent sleeping
- Enable Heroku Redis for better performance
- Set up automatic backups for MongoDB

---

### 🟢 VPS (Ubuntu/Debian)

**For servers like DigitalOcean, Linode, AWS EC2:**

1. **Update System**
```bash
sudo apt update && sudo apt upgrade -y
```

2. **Install Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

3. **Install PM2**
```bash
sudo npm install -g pm2
```

4. **Clone and Setup**
```bash
git clone https://github.com/neimantech1/Thanos.git
cd Thanos
npm install
```

5. **Create .env File**
```bash
nano .env
```
Add your configuration and save (Ctrl+X, Y, Enter)

6. **Start with PM2**
```bash
pm2 start app.js --name thanos-bot
pm2 save
pm2 startup
```

7. **Setup Nginx (Optional)**
```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/thanos
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/thanos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

8. **Setup SSL (Optional)**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your_domain.com
```

**Management Commands:**
```bash
pm2 status          # Check status
pm2 logs thanos-bot # View logs
pm2 restart thanos-bot # Restart
pm2 stop thanos-bot # Stop
pm2 delete thanos-bot # Remove
```

---

### 📱 Termux (Android)

**Requirements:**
- Android device
- Termux app from F-Droid (NOT Google Play)
- Stable internet connection

**Installation:**

1. **Update Termux**
```bash
pkg update && pkg upgrade -y
```

2. **Install Dependencies**
```bash
pkg install nodejs git -y
```

3. **Clone Repository**
```bash
cd storage/downloads
git clone https://github.com/neimantech1/Thanos.git
cd Thanos
```

4. **Install Packages**
```bash
npm install
```

5. **Configure**
```bash
nano .env
```
Add your MongoDB URI and settings, save (Ctrl+X, Y, Enter)

6. **Run Bot**
```bash
npm start
```

**Access Web Interface:**
- Open browser on same device
- Go to `http://localhost:3000`
- Or use your local IP: `http://192.168.x.x:3000` (from other devices)

**Keep Running:**
```bash
# Install termux-services
pkg install termux-services -y

# Or use screen
pkg install screen -y
screen -S thanos
npm start
# Press Ctrl+A then D to detach
# Reattach: screen -r thanos
```

**Tips:**
- Keep Termux awake (Settings → Disable battery optimization)
- Use Termux:Boot for auto-start on device boot
- Consider using a VPS for 24/7 operation

---

### 💬 Discord Server Hosting

**Host on a Discord bot server VM:**

1. **Get Bot Server Access**
   - Join a hosting Discord server that provides VMs
   - Request a free tier server or purchase one

2. **Setup Steps**
```bash
# Connect via SSH provided by Discord host
ssh user@server-ip

# Follow VPS installation steps above
git clone https://github.com/neimantech1/Thanos.git
cd Thanos
npm install
nano .env  # Configure
pm2 start app.js --name thanos
```

3. **Access Bot**
   - Use provided domain/IP from hosting provider
   - Example: `http://bot-12345.hostprovider.com:3000`

**Popular Discord Hosting Communities:**
- Search "free bot hosting discord" on Disboard
- Most provide 24/7 uptime
- Limited resources on free tier

---

## 🔧 CONFIGURATION

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB Atlas connection string | Required |
| `PORT` | Server port | `3000` |
| `DB_NAME` | Database name | `thanos` |
| `THANOS` | AI chat enabled (`yes`/`no`) | `yes` |
| `GROUP_CONTROL` | Spam protection enabled | `yes` |

### Bot Settings (settings.js)

```javascript
// Database name
const dbName = "thanos"

// AI API key (if using external AI)
const GROQ_API_KEY = "your_key"

// Bot states
thanos: "yes"           // AI responses
groupControl: "yes"     // Protection features
```

### Spam Detection Limits

Default settings in `controllers/group.js`:
- **Max message length**: 160 characters
- **Mute duration**: 10 minutes
- **Admin link limit**: 2 links allowed
- **Bot detection**: Enabled

Customize in function calls:
```javascript
realtimeSpamControl(sock, msg, botNumber, {
    maxChars: 200,        // Your limit
    muteDuration: 15 * 60 * 1000, // 15 mins
    adminLinkLimit: 5,
    enableBotDetection: true
});
```

---

## 📊 USAGE GUIDE

### Basic Operation

1. **Activate Bot**
   - Send `chat` or `type` in private or group
   - Bot responds: "✅ Thanos is Now Active"

2. **Chat with AI**
   - In private chats: Just send messages
   - In groups: Reply to bot's messages

3. **Deactivate Bot**
   - Send `zip`, `shut up`, or `sleep`
   - Bot responds: "❌ Thanos has been deactivated"

### Group Protection

**Enable Protection:**
```
groupcontrol on
```

**What it protects against:**
- Messages longer than 160 characters (configurable)
- Unauthorized links and promotional content
- Bot/automated accounts
- Rapid message spamming

**Check Protection Status:**
```
groupstatus
```

**Scan Entire Chat History:**
```
blacklist
```
This scans all messages and removes spam, mutes violators.

### Managing Users

**View Banned Users:**
```
banned
```

**View Muted Users:**
```
muted
```

**Unban a User:**
```
unban @username
```
(Tag the user when sending command)

**Check Ban Status:**
```
checkban @username
```

---

## 🛠️ TROUBLESHOOTING

### Bot Not Responding

**Check Status:**
1. Visit web interface - is it showing "Connected"?
2. Send `ping` - does it respond with "pong 🏓"?
3. Check if AI is active - send `menu` and look at status

**Solutions:**
- Restart bot: `npm start` or `pm2 restart thanos-bot`
- Check MongoDB connection in logs
- Verify environment variables are set
- Try logging out and reconnecting WhatsApp

### QR Code Not Showing

**Solutions:**
- Wait 10-15 seconds for QR generation
- Refresh the web page
- Check server logs for errors
- Ensure port 3000 is accessible
- Try using pairing code method instead

### Session Keeps Disconnecting

**Common Causes:**
- Free hosting tier sleeping (Render free tier)
- MongoDB connection timeout
- WhatsApp phone number inactive

**Solutions:**
- Use paid hosting tier for 24/7 uptime
- Check MongoDB Atlas whitelist (allow all IPs: 0.0.0.0/0)
- Keep WhatsApp phone active
- Enable auto-reconnect in settings

### Spam Detection Too Aggressive

**Adjust Settings:**

Edit `controllers/group.js`:
```javascript
// Increase character limit
maxChars: 300  // from 160

// Reduce mute duration
muteDuration: 5 * 60 * 1000  // 5 minutes

// Allow more links for admins
adminLinkLimit: 5  // from 2
```

### Can't Access Web Interface

**Check These:**
1. Bot is running: `pm2 status` or check Render dashboard
2. Correct URL: `http://your-domain.com:3000` or `https://your-app.render.com`
3. Firewall: Allow port 3000 (VPS users)
4. Environment: Check `PORT` variable is set

**VPS Users:**
```bash
# Check if bot is running
pm2 status

# Check if port is open
sudo ufw status
sudo ufw allow 3000

# Check if app is listening
netstat -tlnp | grep 3000
```

### MongoDB Connection Error

**Error:** `MongoNetworkError` or `MongoServerError`

**Solutions:**
1. **Whitelist Your IP:**
   - Go to MongoDB Atlas → Network Access
   - Add IP Address: `0.0.0.0/0` (allow all)

2. **Check Connection String:**
   - Ensure format: `mongodb+srv://username:password@cluster.mongodb.net/dbname`
   - No spaces in the string
   - Password is URL-encoded (use `%40` for `@`)

3. **Database User:**
   - Verify username/password are correct
   - User has read/write permissions

### Memory Issues (VPS/Termux)

**Symptoms:** Bot crashes with "out of memory" error

**Solutions:**
```bash
# Increase Node memory limit
node --max-old-space-size=512 app.js

# Or with PM2
pm2 start app.js --name thanos --max-memory-restart 500M
```

**Termux Specific:**
```bash
# Limit memory usage
pm2 start app.js --name thanos --max-memory-restart 200M
```

---

## 📝 LOGS & MONITORING

### View Logs

**PM2 (VPS):**
```bash
pm2 logs thanos-bot
pm2 logs thanos-bot --lines 100  # Last 100 lines
```

**Render:**
- Dashboard → Logs tab
- Real-time streaming logs

**Heroku:**
```bash
heroku logs --tail
heroku logs --tail --num 200  # Last 200 lines
```

**Termux:**
```bash
# If using screen
screen -r thanos
# View output directly

# Or redirect to file
npm start > logs.txt 2>&1 &
tail -f logs.txt
```

### Log Messages Explained

- `✅ Connected to MongoDB Atlas` - Database connected
- `✅ WhatsApp Connected!` - Bot is online
- `📤 Bot message tracked` - Bot sent a message
- `🔍 Checking if reply to bot` - Group message analysis
- `🚨 SPAM FOUND` - Spam detected and removed
- `🔇 MUTED` - User temporarily muted
- `🤖 BOT DETECTED` - Automated account banned

---

## 🔒 SECURITY NOTES

### Best Practices

1. **Never Share:**
   - `.env` file contents
   - MongoDB connection strings
   - Session files (`auth_session` folder)

2. **Environment Variables:**
   - Use platform environment variables (don't commit .env)
   - Rotate MongoDB passwords periodically
   - Use strong passwords with special characters

3. **Session Security:**
   - Sessions are encrypted in MongoDB
   - Only you can access with correct connection string
   - Log out removes session from database

4. **Bot Permissions:**
   - Make bot admin only if needed
   - Bot doesn't need admin to function in groups
   - Admin rights only required for deletion features

### Privacy

- Bot processes messages locally
- No messages are stored (only session data in MongoDB)
- AI conversations use context from current chat only
- History is maintained per user/group in memory only

---

## 📞 SUPPORT

### Get Help

1. **GitHub Issues:** [Report bugs or request features](https://github.com/neimantech1/Thanos/issues)
2. **Documentation:** Check this README for common solutions
3. **Community:** Star the repo and check discussions

### Reporting Issues

Include these details:
- Platform (Render/Heroku/VPS/Termux)
- Node.js version: `node --version`
- Error messages from logs
- Steps to reproduce
- What you've already tried

---

## 📄 LICENSE

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 ACKNOWLEDGMENTS

Built with:
- [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Database hosting
- [Express.js](https://expressjs.com/) - Web framework
- [Socket.IO](https://socket.io/) - Real-time communication

---

<div align="center">

**⚡ NOW, REALITY CAN BE WHATEVER I WANT ⚡**

*Made with 💜 by MCU NEIMAN TECH*

[![GitHub](https://img.shields.io/badge/GitHub-neimantech1-purple?style=for-the-badge&logo=github)](https://github.com/neimantech1)

```
█████████████████████████████████████████
█░░░░░░░░░░░░░░░ I AM INEVITABLE ░░░░░░█
█████████████████████████████████████████
```

</div>