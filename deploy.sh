#!/bin/bash

# Build the project
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
