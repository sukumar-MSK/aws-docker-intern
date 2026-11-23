pipeline {
    agent any

    environment {
        EC2_HOST = "ubuntu@3.111.33.137"
    }

    stages {
        stage('1. Checkout Code') {
            steps {
                git branch: 'main', url: 'https://github.com/sukumar-MSK/aws-docker-intern'
            }
        }

        stage('2. Deploy to AWS EC2 via SSH') {
            steps {
                sshagent(credentials: ['aws-ec2-key']) {
                    sh '''
                        ssh -T -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=10 $EC2_HOST << 'EOF'
                            set -e
                            rm -rf aws-docker-intern
                            git clone https://github.com/sukumar-MSK/aws-docker-intern
                            cd aws-docker-intern
                            sudo docker build -f docker-file-t my-internship-app:latest .
                            sudo docker stop internship-container || true
                            sudo docker rm internship-container || true
                            sudo docker run -d -p 80:80 --name internship-container my-internship-app:latest
                            EOF
                    '''
                }
            }
        }
    }
}
