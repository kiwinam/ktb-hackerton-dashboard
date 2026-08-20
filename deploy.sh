#!/bin/bash

# deploy.sh는 항상 production 모드로 빌드하여 접두사 없는 운영 컬렉션을 사용합니다.
echo "🏗️  Building project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "✅ Build successful!"
  
  # Deploy to Firebase
  echo "🚀 Deploying to Firebase Hosting..."
  firebase deploy --only hosting
  
  echo "✨ Deployment complete!"
else
  echo "❌ Build failed. Deployment aborted."
  exit 1
fi
