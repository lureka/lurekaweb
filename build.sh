#!/bin/bash

# Build script for Netlify deployment
echo "🔨 Building project..."

# Build with Vite
npm run build

# Copy additional files that Vite doesn't handle
echo "📁 Copying additional files..."
cp -r public/contact.html public/success.html public/_redirects public/fonts public/3d dist/

# Copy images with correct structure
echo "🖼️ Organizing images..."
cp -r public/images dist/

# Verify critical files
echo "🔍 Verifying critical files..."
if [ -f "dist/3d/modelo.glb" ]; then
    echo "✅ 3D model found: dist/3d/modelo.glb"
else
    echo "❌ ERROR: 3D model missing!"
    exit 1
fi

if [ -f "dist/_redirects" ]; then
    echo "✅ Netlify redirects found"
else
    echo "❌ ERROR: _redirects missing!"
    exit 1
fi

echo "✅ Build complete! Ready for Netlify deployment."
echo "📂 Files in dist/:"
ls -la dist/
