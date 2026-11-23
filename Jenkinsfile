pipeline {
    agent any

    environment {
        EC2_HOST = "3.111.33.137"
    }

    stages {
        stage('1. Checkout Code') {
            steps {
                git branch: 'main', url: 'https://github.com'
            }
        }

        stage('2. Deploy to AWS EC2 via SSH') {
            steps {
                sshagent(credentials: ['aws-ec2-key']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no $EC2_HOST << 'EOF'
                            rm -rf aws-docker-intern
                            git clone https://github.com
                            cd aws-docker-intern
                            sudo docker build -t my-internship-app:latest .
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
