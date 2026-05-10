#!/data/data/com.termux/files/usr/bin/bash
# ─────────────────────────────────────────────────────────────
# DOOODHWALA — Termux One-Time Setup Script
# Run this ONCE after copying the project to the phone
# ─────────────────────────────────────────────────────────────

set -e

echo ""
echo "🐄 DOOODHWALA Termux Setup"
echo "─────────────────────────────────"

# 1. Update packages
echo "📦 Updating Termux packages..."
pkg update -y && pkg upgrade -y

# 2. Install required packages
echo "📦 Installing Node.js, git, curl..."
pkg install -y nodejs git curl

# Check Node version
NODE_VER=$(node --version)
echo "✅ Node.js $NODE_VER installed"

# 3. Install dependencies
echo "📦 Installing project dependencies (this may take a few minutes)..."
npm install

echo "✅ Dependencies installed"

# 4. Install cloudflared for the tunnel
echo "📦 Installing cloudflared..."
pkg install -y cloudflared 2>/dev/null || {
    # Fallback: download binary directly
    echo "Downloading cloudflared binary..."
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 \
         -o $PREFIX/bin/cloudflared
    chmod +x $PREFIX/bin/cloudflared
}
echo "✅ cloudflared installed"

# 5. Create the boot directory
mkdir -p ~/.termux/boot
echo "✅ Boot directory created"

# 6. Create the auto-start script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cat > ~/.termux/boot/start-dooodhwala.sh << EOF
#!/data/data/com.termux/files/usr/bin/bash
# Auto-starts on phone boot via Termux:Boot
# Starts the Express server + Cloudflare tunnel

cd "$SCRIPT_DIR"

# Start the server in background
nohup npx tsx server/index.ts >> ~/dooodhwala-server.log 2>&1 &
echo "Server PID: \$!" >> ~/dooodhwala-server.log

# Wait for server to be ready
sleep 5

# Start Cloudflare tunnel in background
nohup cloudflared tunnel --url http://localhost:5001 >> ~/dooodhwala-tunnel.log 2>&1 &
echo "Tunnel PID: \$!" >> ~/dooodhwala-tunnel.log

echo "[\$(date)] DOOODHWALA started" >> ~/dooodhwala-server.log
EOF

chmod +x ~/.termux/boot/start-dooodhwala.sh
echo "✅ Boot script created at ~/.termux/boot/start-dooodhwala.sh"

# 7. Create a manual start script
cat > "$SCRIPT_DIR/start.sh" << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# ─────────────────────────────────────────────────
# DOOODHWALA — Manual Start Script
# Run this to start the server + tunnel manually
# ─────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Kill any existing instances
pkill -f "tsx server/index.ts" 2>/dev/null || true
pkill -f "cloudflared" 2>/dev/null || true
sleep 1

echo "🚀 Starting DOOODHWALA server..."
npx tsx server/index.ts &
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"

echo "⏳ Waiting for server to start..."
sleep 5

# Check server is running
if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
    echo "✅ Server is up!"
else
    echo "⚠️  Server health check failed — check logs"
fi

echo ""
echo "🌐 Starting Cloudflare tunnel..."
cloudflared tunnel --url http://localhost:5001 2>&1 | tee ~/dooodhwala-tunnel.log &
TUNNEL_PID=$!
echo "   Tunnel PID: $TUNNEL_PID"

echo ""
echo "─────────────────────────────────────────────────"
echo "📋 Watch for a line like:"
echo "   https://xxxx-xxxx.trycloudflare.com"
echo "   That is your public API URL!"
echo ""
echo "📱 Once you have the URL, update EAS:"
echo "   eas env:update --variable-name EXPO_PUBLIC_API_URL \\"
echo "     --value 'https://xxxx.trycloudflare.com' \\"
echo "     --environment production"
echo ""
echo "📱 Also set the same URL in the SMS Gateway app."
echo "─────────────────────────────────────────────────"

# Keep terminal open to show tunnel URL
wait $TUNNEL_PID
EOF

chmod +x "$SCRIPT_DIR/start.sh"
echo "✅ start.sh created in project root"

echo ""
echo "─────────────────────────────────────────────────"
echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Copy your .env file to this directory"
echo "   (must have DATABASE_URL, RAZORPAY keys, etc.)"
echo ""
echo "2. Run the server:  ./start.sh"
echo ""
echo "3. Install Termux:Boot from F-Droid for auto-start on reboot"
echo "─────────────────────────────────────────────────"
