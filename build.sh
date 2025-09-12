#!/bin/bash

# Build script for Netlify deployment
echo "🔨 Building project..."

# Build with Vite
npm run build

# Copy additional files that Vite doesn't handle
echo "📁 Copying additional files..."
cp -r public/contact.html public/success.html public/_redirects public/fonts public/3d dist/

# Update CSS references in HTML files with current build hash
echo "🎨 Updating CSS references..."
CSS_FILE=$(ls dist/assets/index-*.css | head -1 | xargs basename)
if [ -n "$CSS_FILE" ]; then
    echo "📝 Found CSS file: $CSS_FILE"
    # Update contact.html - change from /css/styles.css to hashed version
    sed -i.bak "s|/css/styles\.css|/assets/$CSS_FILE|g" dist/contact.html
    # Update success.html - change from /css/styles.css to hashed version
    sed -i.bak "s|/css/styles\.css|/assets/$CSS_FILE|g" dist/success.html
    # Clean up backup files
    rm -f dist/contact.html.bak dist/success.html.bak
    echo "✅ CSS references updated in HTML files"
else
    echo "❌ ERROR: CSS file not found!"
    exit 1
fi

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
