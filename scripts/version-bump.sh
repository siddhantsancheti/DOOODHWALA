#!/bin/bash

# DOOODHWALA Mobile App - Build Versioning Script
# Usage: ./version-bump.sh [major|minor|patch]

VERSION_FILE="package.json"
ANDROID_MANIFEST="android/app/build.gradle"
IOS_PLIST="ios/App/App/Info.plist"

# Get current version
CURRENT_VERSION=$(grep '"version"' $VERSION_FILE | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/')

echo "Current version: $CURRENT_VERSION"

# Parse version components
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

# Determine new version
case "$1" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo "Usage: $0 [major|minor|patch]"
    exit 1
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
ANDROID_VERSION_CODE=$((MAJOR * 10000 + MINOR * 100 + PATCH))

echo "New version: $NEW_VERSION"
echo "Android version code: $ANDROID_VERSION_CODE"

# Update package.json
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" $VERSION_FILE

# Update Android build.gradle
sed -i "s/versionCode [0-9]*/versionCode $ANDROID_VERSION_CODE/" $ANDROID_MANIFEST
sed -i "s/versionName \"[^\"]*\"/versionName \"$NEW_VERSION\"/" $ANDROID_MANIFEST

# Update iOS Info.plist
sed -i "s/<string>[0-9.]*<\/string>/<string>$NEW_VERSION<\/string>/g" $IOS_PLIST

echo "✓ Version updated to $NEW_VERSION"
echo "✓ Android version code: $ANDROID_VERSION_CODE"
echo ""
echo "Next steps:"
echo "1. Review changes in package.json, build.gradle, and Info.plist"
echo "2. Run: npm run build"
echo "3. Run: npx cap sync"
echo "4. Build for Android: ./gradlew bundleRelease"
echo "5. Build for iOS: xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release"
