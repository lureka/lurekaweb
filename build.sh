#!/bin/bash

# Build script for Netlify deployment
echo "🔨 Building project..."

# Build with Vite
npm run build

# Copy additional files that Vite doesn't handle
echo "📁 Copying additional files..."
# Copiar todos los HTML que no sean index.html (Vite ya lo procesa)
cp public/3dcity.html public/contact.html public/success.html dist/

# Copiar archivos JS (excepto main.js que es procesado por Vite)
echo "📜 Copying JavaScript files..."
mkdir -p dist/js
# Copiar solo los JS que no son procesados por Vite
cp public/js/index.js public/js/collapsible.js dist/js/ 2>/dev/null || true
# main.js es procesado por Vite y se genera en dist/js/main-[hash].js

# Copiar CSS estático para 3dcity.html (styles.css no es procesado por Vite)
echo "🎨 Copying CSS files..."
mkdir -p dist/css
cp public/css/styles.css dist/css/ 2>/dev/null || true

# Copiar archivos estáticos
cp -r public/_redirects public/fonts public/3d dist/

# Copiar imágenes
echo "🖼️ Organizing images..."
cp -r public/images dist/

# Copiar videos
echo "🎬 Copying videos..."
cp -r public/video dist/ 2>/dev/null || true

# Update CSS references in HTML files with current build hash
echo "🎨 Updating CSS references..."
CSS_FILE=$(ls dist/assets/index-*.css | head -1 | xargs basename)
if [ -n "$CSS_FILE" ]; then
    echo "📝 Found CSS file: $CSS_FILE"
    # contact.html y success.html mantienen /css/styles.css (ya copiado arriba)
    # 3dcity.html mantiene /css/styles.css (ya copiado arriba)
    # Solo actualizamos si hay otros archivos que necesiten el CSS con hash
    echo "✅ CSS files ready (styles.css for contact/success/3dcity, hashed CSS for index)"
else
    echo "⚠️ WARNING: CSS file not found, but continuing..."
fi

# Update JS reference in 3dcity.html (in dist/) to use the processed main.js with hash
# Remove type="module" because the bundled file is not an ES module
echo "🔧 Updating JavaScript references in dist/3dcity.html..."
MAIN_JS_FILE=$(ls dist/js/main-*.js | head -1 | xargs basename)
if [ -n "$MAIN_JS_FILE" ]; then
    echo "📝 Found processed main.js: $MAIN_JS_FILE"
    # Update dist/3dcity.html: replace the script tag to remove type="module" and update the path
    # This only affects the production build in dist/, not the local public/ version
    sed -i.bak 's|<script type="module" src="/js/main\.js" defer></script>|<script src="/js/'"$MAIN_JS_FILE"'" defer></script>|g' dist/3dcity.html 2>/dev/null || true
    # Fallback: if the pattern doesn't match, try without type="module" check
    sed -i.bak "s|src=\"/js/main\.js\"|src=\"/js/$MAIN_JS_FILE\"|g" dist/3dcity.html 2>/dev/null || true
    rm -f dist/3dcity.html.bak
    echo "✅ JavaScript reference updated in dist/3dcity.html (production only)"
else
    echo "⚠️ WARNING: Processed main.js not found!"
fi

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