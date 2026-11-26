# Modern Dark Login Application — React + Flask

Two independently buildable services:
- `frontend/`: React + Vite, served by Nginx; `/api/*` is reverse-proxied to Flask.
- `backend/`: Flask REST API, SQLAlchemy, password hashing, JWT authentication, password-reset token flow.

## 1. Local development

Requirements: Node.js 20+, npm, Python 3.11+.

Backend:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
flask --app app run --host 0.0.0.0 --port 5000
```

Frontend (second terminal):
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. Vite proxies `/api` to Flask on `localhost:5000`.

For local development, SQLite is used by default (`sqlite:///./app.db`). To use MySQL, set `DATABASE_URL` as shown in `backend/.env.example`.

## 2. Docker Compose test

From the project root:
```bash
docker compose up --build
```
Open http://localhost:8081.

The compose setup uses MySQL. It creates a local development database and is not a production secrets/configuration template. Change all example passwords before any shared deployment.

## 3. AWS ECR + Jenkins

Create two ECR repositories:
- `frontend-repo`
- `backend-repo`

Create a least-privilege IAM identity/role with ECR push permissions for those repositories. In Jenkins:
- Install/configure the **AWS Credentials** plugin.
- Add an AWS credential with ID `aws-ecr-credentials`.
- Ensure the Jenkins agent has AWS CLI v2 and Docker installed and can access the Docker daemon.
- Update `AWS_REGION` and `AWS_ACCOUNT_ID` in each Jenkinsfile.
- Create one Pipeline job per repository, pointing at the matching GitHub repository and its `Jenkinsfile`.

The pipelines build and push immutable build-number tags plus `latest`. They do not deploy to EC2 automatically; first verify both images exist in ECR. For EC2, attach an instance role with ECR pull permissions, install Docker and Docker Compose, and deploy with environment variables/secrets stored on EC2 (not in Git).

Example pull:
```bash
aws ecr get-login-password --region YOUR_REGION \
  | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com

docker pull YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/frontend-repo:latest
docker pull YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/backend-repo:latest
```

## 4. Authentication notes

- Passwords are hashed with Werkzeug; plaintext passwords are never stored.
- JWT secret must be changed to a long random value for deployment.
- Forgot-password requests always return a generic response to avoid account enumeration.
- For a local demo only, set `RESET_TOKEN_DEBUG=true`; the API then includes a reset token in its JSON response. Keep this **false** in any shared/production environment. A real deployment should deliver a one-time reset link through a verified email provider.
- This starter uses JWT in browser localStorage for simplicity of demonstration. For production, prefer secure, HttpOnly cookies, CSRF protection, HTTPS, rate limiting, email verification, and a security review.
- MySQL database persistence is configured by `DATABASE_URL`; schema auto-creation is enabled for this starter only. Use migrations (Alembic/Flask-Migrate) for production.

## 5. API routes

- `GET /api/health`
- `POST /api/auth/register` `{name,email,password}`
- `POST /api/auth/login` `{email,password}`
- `GET /api/auth/me` (Bearer token)
- `POST /api/auth/forgot-password` `{email}`
- `POST /api/auth/reset-password` `{token,new_password}`

Do not commit `.env` files, real credentials, database dumps, or reset tokens.
