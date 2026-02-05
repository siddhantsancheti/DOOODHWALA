#!/bin/bash

# DOOODHWALA Production Build Script
# Creates optimized builds for Android and iOS

set -e

echo "=========================================="
echo "DOOODHWALA Production Build Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create .env file from .env.example"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ required${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment setup verified${NC}"
echo ""

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production > /dev/null 2>&1 || npm install > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 2: Run type checking
echo "🔍 Type checking..."
npm run check > /dev/null 2>&1 || {
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Type checking passed${NC}"
echo ""

# Step 3: Run security audit
echo "🔐 Running security audit..."
npm audit --level=moderate > /dev/null 2>&1 || {
    echo -e "${YELLOW}⚠ Security vulnerabilities found${NC}"
    echo "   Run: npm audit fix"
}
echo ""

# Step 4: Build for web
echo "🏗️ Building web application..."
npm run build > /dev/null 2>&1 || {
    echo -e "${RED}❌ Web build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Web build complete${NC}"
echo ""

# Step 5: Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync > /dev/null 2>&1 || {
    echo -e "${RED}❌ Capacitor sync failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Capacitor sync complete${NC}"
echo ""

# Step 6: Build Android
echo "📱 Building Android..."
cd android
./gradlew bundleRelease > /dev/null 2>&1 || {
    echo -e "${RED}❌ Android build failed${NC}"
    exit 1
}
cd ..
echo -e "${GREEN}✓ Android AAB created${NC}"
echo "   Location: android/app/build/outputs/bundle/release/app-release.aab"
echo ""

# Step 7: Build iOS (requires Mac)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Building iOS..."
    cd ios/App
    xcodebuild -workspace App.xcworkspace \
        -scheme App \
        -configuration Release \
        -derivedDataPath build > /dev/null 2>&1 || {
        echo -e "${RED}❌ iOS build failed${NC}"
        exit 1
    }
    cd ../..
    echo -e "${GREEN}✓ iOS build complete${NC}"
    echo "   Location: ios/App/build"
else
    echo -e "${YELLOW}⚠ iOS build skipped (requires macOS)${NC}"
fi
echo ""

# Step 8: Summary
echo "=========================================="
echo -e "${GREEN}🎉 Production Build Complete!${NC}"
echo "=========================================="
echo ""
echo "Android Bundle:"
echo "  File: android/app/build/outputs/bundle/release/app-release.aab"
echo "  Upload to: Google Play Console"
echo ""
echo "iOS Build:"
echo "  File: ios/App/build"
echo "  Upload to: App Store Connect"
echo ""
echo "Next Steps:"
echo "  1. Test builds on physical devices"
echo "  2. Review app store listings"
echo "  3. Submit to app stores"
echo "  4. Monitor crash reports"
echo ""
