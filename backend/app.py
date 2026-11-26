import os
from datetime import datetime, timedelta, timezone
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, get_jwt_identity,
    jwt_required
)
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv()

db = SQLAlchemy()
jwt = JWTManager()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class PasswordReset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    token_hash = db.Column(db.String(255), nullable=False, unique=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False, nullable=False)


def response_error(message, status):
    return jsonify({"message": message}), status


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-change-me")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-me")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", "60"))
    )
    db.init_app(app)
    jwt.init_app(app)

    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    CORS(app, resources={r"/api/*": {"origins": [x.strip() for x in origins.split(",")]}})

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "flask-backend"})

    @app.post("/api/auth/register")
    def register():
        data = request.get_json(silent=True) or {}
        name = str(data.get("name", "")).strip()
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))

        if not name or len(name) > 100:
            return response_error("Enter a valid name.", 400)
        if "@" not in email or len(email) > 255:
            return response_error("Enter a valid email address.", 400)
        if len(password) < 8:
            return response_error("Password must be at least 8 characters.", 400)
        if User.query.filter_by(email=email).first():
            return response_error("An account with this email already exists.", 409)

        user = User(name=name, email=email,
                    password_hash=generate_password_hash(password))
        db.session.add(user)
        db.session.commit()
        token = create_access_token(identity=str(user.id))
        return jsonify({
            "message": "Account created successfully.",
            "access_token": token,
            "user": {"id": user.id, "name": user.name, "email": user.email}
        }), 201

    @app.post("/api/auth/login")
    def login():
        data = request.get_json(silent=True) or {}
        email = str(data.get("email", "")).strip().lower()
        password = str(data.get("password", ""))
        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password_hash, password):
            return response_error("Invalid email or password.", 401)

        token = create_access_token(identity=str(user.id))
        return jsonify({
            "message": "Login successful.",
            "access_token": token,
            "user": {"id": user.id, "name": user.name, "email": user.email}
        })

    @app.get("/api/auth/me")
    @jwt_required()
    def me():
        user = db.session.get(User, int(get_jwt_identity()))
        if not user:
            return response_error("User not found.", 404)
        return jsonify({"user": {"id": user.id, "name": user.name, "email": user.email}})

    @app.post("/api/auth/forgot-password")
    def forgot_password():
        data = request.get_json(silent=True) or {}
        email = str(data.get("email", "")).strip().lower()
        user = User.query.filter_by(email=email).first()
        # Always return the same public response, whether the account exists or not.
        result = {"message": "If an account exists, password reset instructions will be sent."}
        if user:
            import secrets
            raw_token = secrets.token_urlsafe(32)
            import hashlib
            token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
            reset = PasswordReset(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=datetime.now(timezone.utc) + timedelta(
                    minutes=int(os.getenv("RESET_TOKEN_EXPIRES_MINUTES", "20"))
                )
            )
            db.session.add(reset)
            db.session.commit()
            # Demo-only handoff. Replace with an email provider before deployment.
            if os.getenv("RESET_TOKEN_DEBUG", "false").lower() == "true":
                result["development_reset_token"] = raw_token
        return jsonify(result)

    @app.post("/api/auth/reset-password")
    def reset_password():
        data = request.get_json(silent=True) or {}
        raw_token = str(data.get("token", ""))
        new_password = str(data.get("new_password", ""))
        if len(new_password) < 8:
            return response_error("Password must be at least 8 characters.", 400)
        import hashlib
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        reset = PasswordReset.query.filter_by(token_hash=token_hash, used=False).first()
        now = datetime.now(timezone.utc)
        if not reset or reset.expires_at.replace(tzinfo=timezone.utc) < now:
            return response_error("Reset link is invalid or expired.", 400)
        user = db.session.get(User, reset.user_id)
        if not user:
            return response_error("Reset link is invalid or expired.", 400)
        user.password_hash = generate_password_hash(new_password)
        reset.used = True
        db.session.commit()
        return jsonify({"message": "Password updated. You can now sign in."})

    return app


app = create_app()
