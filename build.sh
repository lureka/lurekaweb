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

echo "✅ Build complete! Ready for Netlify deployment."
echo "📂 Files in dist/:"
ls -la dist/
