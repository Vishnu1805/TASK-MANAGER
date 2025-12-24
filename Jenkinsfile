pipeline {
    agent any

    tools {
        nodejs 'NodeJS18'
    }

    environment {
        CI = 'true'
        APP_DIR = '/opt/task-manager'
        PORT = '3000' // Port where the app will run
    }

    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/Vishnu1805/TASK-MANAGER.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                  npm install
                  sudo npm install -g pm2 serve
                '''
            }
        }

        stage('Build Expo Web') {
            steps {
                sh '''
                  npx expo export --platform web --output-dir web-build
                '''
            }
        }

        stage('Deploy & Run on Port 3000') {
            steps {
                sh '''
                  # 1. Prepare directory
                  sudo mkdir -p ${APP_DIR}
                  sudo chown -R jenkins:jenkins ${APP_DIR}
                  rm -rf ${APP_DIR}/*
                  cp -r web-build/* ${APP_DIR}/

                  # 2. Tell Jenkins not to kill the PM2 background process
                  export JENKINS_NODE_COOKIE=dontKillMe

                  # 3. Start the server using PM2
                  pm2 delete task-manager || true
                  pm2 serve ${APP_DIR} ${PORT} --name task-manager --spa
                  pm2 save
                '''
            }
        }
    }

    post {
        success {
            echo "✅ App is running on port ${PORT}"
        }
        failure {
            echo '❌ Build or deployment failed'
        }
    }
}