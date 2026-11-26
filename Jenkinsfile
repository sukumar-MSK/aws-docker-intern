pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        AWS_REGION = 'ap-south-1'
        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build and Push Docker Images to ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-ecr-credentials'
                ]]) {
                    sh '''
                        set -eu

                        AWS_ACCOUNT_ID=$(aws sts get-caller-identity \
                            --query Account --output text)

                        REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

                        aws ecr get-login-password \
                            --region "$AWS_REGION" |
                            docker login --username AWS \
                            --password-stdin "$REGISTRY"

                        echo "Building backend image..."

                        docker build \
                            -t "$REGISTRY/backend-repo:$IMAGE_TAG" \
                            ./backend

                        docker tag \
                            "$REGISTRY/backend-repo:$IMAGE_TAG" \
                            "$REGISTRY/backend-repo:latest"

                        echo "Building frontend image..."

                        docker build \
                            -t "$REGISTRY/frontend-repo:$IMAGE_TAG" \
                            ./frontend

                        docker tag \
                            "$REGISTRY/frontend-repo:$IMAGE_TAG" \
                            "$REGISTRY/frontend-repo:latest"

                        echo "Pushing backend..."

                        docker push "$REGISTRY/backend-repo:$IMAGE_TAG"
                        docker push "$REGISTRY/backend-repo:latest"

                        echo "Pushing frontend..."

                        docker push "$REGISTRY/frontend-repo:$IMAGE_TAG"
                        docker push "$REGISTRY/frontend-repo:latest"

                        docker logout "$REGISTRY"

                        echo "Both images pushed successfully!"
                    '''
                }
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f || true'
        }
    }
}
