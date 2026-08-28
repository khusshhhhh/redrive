#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Bundle Analysis Script
 * Analyzes Next.js bundle size and provides performance insights
 */

console.log('📊 Starting Bundle Analysis...\n');

console.log('🔨 Building application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

console.log('\n📦 Analyzing bundle sizes...');

const buildDir = path.join(process.cwd(), '.next');
const staticDir = path.join(buildDir, 'static');

if (!fs.existsSync(staticDir)) {
  console.error('❌ Build directory not found. Please run npm run build first.');
  process.exit(1);
}

const buildManifest = path.join(buildDir, 'build-manifest.json');
if (fs.existsSync(buildManifest)) {
  const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
  
  console.log('\n📋 Bundle Analysis Results:');
  console.log('=' .repeat(50));
  
  const pages = manifest.pages || {};
  let totalSize = 0;
  
  Object.entries(pages).forEach(([page, files]) => {
    if (Array.isArray(files)) {
      const pageSize = files.reduce((acc, file) => {
        const filePath = path.join(staticDir, file);
        if (fs.existsSync(filePath)) {
          return acc + fs.statSync(filePath).size;
        }
        return acc;
      }, 0);
      
      if (pageSize > 0) {
        console.log(`📄 ${page}: ${(pageSize / 1024).toFixed(2)} KB`);
        totalSize += pageSize;
      }
    }
  });
  
  console.log('=' .repeat(50));
  console.log(`📊 Total Bundle Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  console.log('\n💡 Performance Recommendations:');
  if (totalSize > 5 * 1024 * 1024) {
    console.log('⚠️  Bundle size is large (>5MB). Consider code splitting.');
  }
  if (totalSize > 10 * 1024 * 1024) {
    console.log('🚨 Bundle size is very large (>10MB). Immediate optimization needed.');
  }
  if (totalSize < 2 * 1024 * 1024) {
    console.log('✅ Bundle size is optimal (<2MB).');
  }
}

console.log('\n🔍 Checking for large files...');
const findLargeFiles = (dir, threshold = 500 * 1024) => {
  const files = [];
  
  const scan = (currentDir) => {
    if (!fs.existsSync(currentDir)) return;
    
    fs.readdirSync(currentDir).forEach(file => {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scan(filePath);
      } else if (stat.size > threshold) {
        files.push({
          path: path.relative(process.cwd(), filePath),
          size: stat.size
        });
      }
    });
  };
  
  scan(dir);
  return files;
};

const largeFiles = findLargeFiles(staticDir);
if (largeFiles.length > 0) {
  console.log('\n📁 Large files found (>500KB):');
  largeFiles
    .sort((a, b) => b.size - a.size)
    .forEach(file => {
      console.log(`   ${file.path}: ${(file.size / 1024).toFixed(2)} KB`);
    });
} else {
  console.log('✅ No large files found.');
}

console.log('\n🌐 Checking public directory...');
const publicDir = path.join(process.cwd(), 'public');
const publicLargeFiles = findLargeFiles(publicDir, 1024 * 1024); // 1MB threshold for public

if (publicLargeFiles.length > 0) {
  console.log('\n📂 Large public assets found (>1MB):');
  publicLargeFiles
    .sort((a, b) => b.size - a.size)
    .forEach(file => {
      console.log(`   ${file.path}: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      if (file.path.includes('.json')) {
        console.log('   💡 Consider moving JSON data to API or database');
      }
      if (file.path.includes('.png') || file.path.includes('.jpg')) {
        console.log('   💡 Consider image optimization (WebP/AVIF)');
      }
    });
}

console.log('\n✅ Bundle analysis complete!');
console.log('\n📈 To monitor bundle size over time:');
console.log('   npm run analyze');
console.log('   npm run bundle-analyzer');

const reportPath = path.join(process.cwd(), 'bundle-analysis-report.json');
const report = {
  timestamp: new Date().toISOString(),
  totalBundleSize: totalSize,
  largeFiles: [...largeFiles, ...publicLargeFiles],
  recommendations: [
    totalSize > 5 * 1024 * 1024 ? 'Consider code splitting' : null,
    publicLargeFiles.length > 0 ? 'Optimize large public assets' : null,
    'Regular bundle monitoring recommended'
  ].filter(Boolean)
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📄 Detailed report saved to: ${reportPath}`);