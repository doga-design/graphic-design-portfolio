# Image Optimization Guide

## ⚡ Your images are loading slow because they're too large

The code is now optimized for speed, but **you need to optimize your actual image files**.

---

## 🎯 Quick Fix: Compress Your Images

### Option 1: Online Tools (Easiest)
1. Go to **https://tinypng.com** or **https://squoosh.app**
2. Upload your images (PNG/JPG)
3. Download the compressed versions
4. Replace the originals in your `/img` folder

### Option 2: Batch Processing (Recommended)
Use ImageMagick or similar tools to batch convert:

```bash
# Install ImageMagick (Mac)
brew install imagemagick

# Compress all JPGs in a folder (80% quality, max 1920px wide)
cd img
for file in *.jpg; do
  convert "$file" -resize 1920x1920\> -quality 80 "optimized_$file"
done

# Compress all PNGs
for file in *.png; do
  convert "$file" -resize 1920x1920\> -quality 80 "optimized_$file"
done
```

---

## 📏 Recommended Image Sizes

| Image Type | Max Width | Max Height | Format | Quality |
|------------|-----------|------------|--------|---------|
| Thumbnails (work cards) | 800px | 600px | JPG | 75-80% |
| Hero images (parallax) | 1920px | 1080px | JPG | 80-85% |
| Gallery images | 1200px | 1200px | JPG | 80% |
| PDFs/documents | - | - | Keep as PDF | - |

---

## ✅ What's Already Optimized in Code

1. ✅ **Aggressive lazy loading** - Images only load when needed
2. ✅ **Fade-in effect** - Smooth transitions as images appear
3. ✅ **Hardware acceleration** - GPU-optimized rendering
4. ✅ **Preconnect hints** - Faster CDN connections
5. ✅ **Font optimization** - `font-display: swap` for instant text
6. ✅ **Parallax optimization** - Only on desktop, cheaper on mobile

---

## 🚀 Expected Results After Image Compression

- **Before**: 5-10 seconds to load a page with 10+ images
- **After**: < 1 second for initial page load, images fade in smoothly

---

## 💡 Pro Tips

1. **Use JPG for photos** (smaller file size)
2. **Use PNG only for logos/graphics** with transparency
3. **Avoid images over 500KB** each
4. **Test on slow 3G** to verify speed improvements

---

## 🔍 Check Your Current Image Sizes

```bash
cd /Users/dodo/Desktop/portfolio/img
ls -lh *.png *.jpg
```

If any file is **over 500KB**, it needs compression!

