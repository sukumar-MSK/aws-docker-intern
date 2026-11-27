pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        AWS_REGION = 'ap-south-1'
        AWS_ACCOUNT_ID = '641401756324'

        ECR_BACKEND = 'react-flask-login-backend'
        ECR_FRONTEND = 'react-flask-login-frontend'

        REGISTRY = '641401756324.dkr.ecr.ap-south-1.amazonaws.com'

        AWS_CREDENTIALS = 'aws-ecr-credentials'

        EC2_HOST = '3.109.203.172'
        EC2_USER = 'ubuntu'
        EC2_SSH_CREDENTIALS = 'EC2-SSH-key'
        EC2_APP_DIR = '/home/ubuntu/docker-intern'
    }

    stages {

        stage('1. GitHub Checkout') {
            steps {
                checkout scm
            }
        }

        stage('2. Verify Tools') {
            steps {
                sh '''
                    set -eu
                    docker --version
                    aws --version
                    git --version
                '''
            }
        }

        stage('3. Verify AWS Credentials') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: "${AWS_CREDENTIALS}"
                ]]) {
                    sh '''
                        set -eu
                        aws sts get-caller-identity
                    '''
                }
            }
        }

        stage('4. Build Backend Image') {
            steps {
                sh '''
                    set -eu

                    docker build \
                      -f backend/Dockerfile \
                      -t ${REGISTRY}/${ECR_BACKEND}:${BUILD_NUMBER} \
                      backend
                '''
            }
        }

        stage('5. Build Frontend Image') {
            steps {
                sh '''
                    set -eu

                    docker build \
                      -f frontend/Dockerfile \
                      -t ${REGISTRY}/${ECR_FRONTEND}:${BUILD_NUMBER} \
                      frontend
                '''
            }
        }

        stage('6. Login to AWS ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: "${AWS_CREDENTIALS}"
                ]]) {
                    sh '''
                        set -eu

                        aws ecr get-login-password \
                          --region ${AWS_REGION} |
                        docker login \
                          --username AWS \
                          --password-stdin ${REGISTRY}
                    '''
                }
            }
        }

        stage('7. Push Backend Image') {
            steps {
                sh '''
                    set -eu

                    docker tag \
                      ${REGISTRY}/${ECR_BACKEND}:${BUILD_NUMBER} \
                      ${REGISTRY}/${ECR_BACKEND}:latest

                    docker push ${REGISTRY}/${ECR_BACKEND}:${BUILD_NUMBER}
                    docker push ${REGISTRY}/${ECR_BACKEND}:latest
                '''
            }
        }

        stage('8. Push Frontend Image') {
            steps {
                sh '''
                    set -eu

                    docker tag \
                      ${REGISTRY}/${ECR_FRONTEND}:${BUILD_NUMBER} \
                      ${REGISTRY}/${ECR_FRONTEND}:latest

                    docker push ${REGISTRY}/${ECR_FRONTEND}:${BUILD_NUMBER}
                    docker push ${REGISTRY}/${ECR_FRONTEND}:latest
                '''
            }
        }


        stage('9. Transfer Compose and ENV Files to EC2') {
            steps {
                sshagent(credentials: ['EC2-SSH-Privatekey']) {
                    withCredentials([
                        file(
                            credentialsId: 'app-env-file',
                            variable: 'APP_ENV_FILE'
                        )
                    ]) {
                        sh '''
                            set -eu

                            echo "Creating EC2 application directory..."

                            ssh -o StrictHostKeyChecking=accept-new \
                              ${EC2_USER}@${EC2_HOST} \
                              "mkdir -p ${EC2_APP_DIR}"

                            echo "Transferring docker-compose.yml..."

                            scp -o StrictHostKeyChecking=accept-new \
                              docker-compose.yml \
                              ${EC2_USER}@${EC2_HOST}:${EC2_APP_DIR}/docker-compose.yml

                            echo "Transferring environment file..."

                            scp -o StrictHostKeyChecking=accept-new \
                              "$APP_ENV_FILE" \
                              ${EC2_USER}@${EC2_HOST}:${EC2_APP_DIR}/.env

                            echo "Setting environment file permissions..."

                            ssh -o StrictHostKeyChecking=accept-new \
                              ${EC2_USER}@${EC2_HOST} \
                              "chmod 600 ${EC2_APP_DIR}/.env"

                            echo "Compose and ENV files transferred successfully!"
                        '''
                    }
                }
            }
        }



        stage('10. Pull Images and Deploy on EC2') {
            steps {
                sshagent(credentials: ['EC2-SSH-Privatekey']) {
                    sh '''
                        set -eu

                        echo "Starting EC2 deployment..."

                        ssh -o StrictHostKeyChecking=accept-new \
                          ${EC2_USER}@${EC2_HOST} \
                          "bash -s -- '${AWS_REGION}' '${REGISTRY}' '${ECR_BACKEND}' '${ECR_FRONTEND}' '${BUILD_NUMBER}' '${EC2_APP_DIR}'" <<'REMOTE'

                        set -eu

                        AWS_REGION="$1"
                        REGISTRY="$2"
                        ECR_BACKEND="$3"
                        ECR_FRONTEND="$4"
                        IMAGE_TAG="$5"
                        APP_DIR="$6"

                        cd "$APP_DIR"

                        echo "Checking environment file..."

                        if [ ! -s .env ]; then
                            echo "ERROR: .env file missing or empty!"
                            exit 1
                        fi

                        chmod 600 .env

                        echo "Creating EC2 Compose override..."

                        cat > docker-compose.ec2.yml <<EOF
        services:
          backend:
            image: ${REGISTRY}/${ECR_BACKEND}:${IMAGE_TAG}
            pull_policy: always
            environment:
              CORS_ORIGINS: "http://3.109.203.172:8081"
              RESET_TOKEN_DEBUG: "false"

          frontend:
            image: ${REGISTRY}/${ECR_FRONTEND}:${IMAGE_TAG}
            pull_policy: always
EOF

                        echo "Validating Docker Compose configuration..."

                        sudo docker compose \
                          -f docker-compose.yml \
                          -f docker-compose.ec2.yml \
                          config --quiet

                        echo "Logging in to AWS ECR..."

                        aws ecr get-login-password \
                          --region "$AWS_REGION" |
                        sudo docker login \
                          --username AWS \
                          --password-stdin "$REGISTRY"

                        echo "Pulling latest application images..."

                        sudo docker compose \
                          -f docker-compose.yml \
                          -f docker-compose.ec2.yml \
                          pull backend frontend

                        echo "Deploying application..."

                        sudo docker compose \
                          -f docker-compose.yml \
                          -f docker-compose.ec2.yml \
                          up -d --no-build --remove-orphans

                        echo "Checking deployment status..."

                        sudo docker compose \
                          -f docker-compose.yml \
                          -f docker-compose.ec2.yml \
                          ps

                        sudo docker logout "$REGISTRY"

                        echo "EC2 DEPLOYMENT SUCCESSFUL!"

REMOTE
                    '''
                }
            }
        }


        stage('11. Verify ECR Images') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: "${AWS_CREDENTIALS}"
                ]]) {
                    sh '''
                        set -eu

                        aws ecr describe-images \
                          --repository-name ${ECR_BACKEND} \
                          --region ${AWS_REGION}

                        aws ecr describe-images \
                          --repository-name ${ECR_FRONTEND} \
                          --region ${AWS_REGION}
                    '''
                }
            }
        }
    }


    post {
        success {
            echo 'SUCCESS: Build, ECR Push, EC2 Pull and Deployment completed!'
            echo 'Application: http://3.109.203.172:8081'
        }

        failure {
            echo 'FAILED: Check Jenkins Console Output.'
        }

        always {
            sh '''
                docker logout ${REGISTRY} || true
            '''
        }
    }
}
