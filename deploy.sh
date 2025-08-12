#!/bin/bash
set -e

REPO_DIR="/home/ubuntu/TASK-MANAGER"
DOCKER_IMAGE="taskmanager:latest"

echo "🚀 Starting deployment..."

cd "$REPO_DIR"
echo "📥 Pulling latest code..."
git pull origin main

echo "🐳 Building Docker image..."
sudo docker build -t $DOCKER_IMAGE .

echo "🛑 Stopping old container..."
sudo docker stop taskmanager_container || true
sudo docker rm taskmanager_container || true

echo "▶️ Starting new container..."
sudo docker run -d --name taskmanager_container -p 80:80 $DOCKER_IMAGE

echo "✅ Deployment completed successfully!"
