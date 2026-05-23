from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
import random
import string
import base64
from cryptography.fernet import Fernet

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'legacy-vault-super-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours instead of 30 minutes
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30 days instead of 7
OTP_EXPIRE_MINUTES = 10
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15

# App-Store / Play-Store reviewer accounts that bypass OTP entirely.
# These emails are allowed to skip the 2FA OTP step so Apple/Google reviewers
# can log in cleanly without access to the OTP email inbox.
REVIEWER_BYPASS_EMAILS = {
    "chaudechaussettes@yahoo.com",
}

# AES-256 Encryption Key (Fernet uses AES-128-CBC under the hood; for production use a proper key management system)
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', None)
if not ENCRYPTION_KEY:
    # Generate a stable key from the JWT secret so it persists across restarts
    import hashlib
    key_bytes = hashlib.sha256(SECRET_KEY.encode()).digest()
    ENCRYPTION_KEY = base64.urlsafe_b64encode(key_bytes)
else:
    ENCRYPTION_KEY = ENCRYPTION_KEY.encode()

fernet = Fernet(ENCRYPTION_KEY)

# Twilio Configuration (optional - falls back to email or console logging)
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER', '')
TWILIO_ENABLED = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER)

# Email SMTP Configuration (Gmail)
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', '')
SMTP_APP_PASSWORD = os.environ.get('SMTP_APP_PASSWORD', '')
EMAIL_ENABLED = bool(SMTP_EMAIL and SMTP_APP_PASSWORD)

# Create the main app without a prefix
app = FastAPI(title="Last Chapter Vault API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# ============================================
# MODELS
# ============================================

class UserRole(str):
    OWNER = "owner"
    EXECUTOR = "executor"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str  # "owner" or "executor"
    phone: Optional[str] = None
    executor_info: Optional[dict] = None  # For executor: address, etc.
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v
    
    @validator('role')
    def validate_role(cls, v):
        if v not in ['owner', 'executor']:
            raise ValueError('Role must be either "owner" or "executor"')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str
    phone: Optional[str] = None
    executor_info: Optional[dict] = None
    password_hash: str
    is_active: bool = True
    is_verified: bool = False
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class OTP(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    otp_code: str
    expires_at: datetime
    used: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    refresh_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)

class AccessLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    action: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# ============================================
# DOCUMENT MODELS
# ============================================

class DocumentCategory(str):
    WILL = "will"
    TRUST = "trust"
    INSURANCE = "insurance"
    LEGAL = "legal"
    PROPERTY = "property"
    FINANCIAL = "financial"
    MEDICAL = "medical"
    OTHER = "other"

class DocumentCreate(BaseModel):
    title: str
    category: str
    description: Optional[str] = None
    file_data: str  # base64 encoded file
    file_name: str
    file_type: str  # mime type
    file_size: int  # in bytes

    @validator('category')
    def validate_category(cls, v):
        valid_categories = ['will', 'trust', 'insurance', 'legal', 'property', 'financial', 'medical', 'other']
        if v not in valid_categories:
            raise ValueError(f'Category must be one of: {", ".join(valid_categories)}')
        return v

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None

class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    category: str
    description: Optional[str] = None
    file_data: str  # base64 encoded
    file_name: str
    file_type: str
    file_size: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ============================================
# ASSET & BENEFICIARY MODELS
# ============================================

class AssetType(str):
    BANK_ACCOUNT = "bank_account"
    REAL_ESTATE = "real_estate"
    INVESTMENT = "investment"
    VEHICLE = "vehicle"
    CRYPTOCURRENCY = "cryptocurrency"
    SOCIAL_MEDIA = "social_media"
    CLOUD_STORAGE = "cloud_storage"
    DEBT = "debt"
    OTHER = "other"

class AssetCreate(BaseModel):
    name: str
    asset_type: str
    value: Optional[float] = None
    description: Optional[str] = None
    account_number: Optional[str] = None
    institution: Optional[str] = None
    location: Optional[str] = None
    access_info: Optional[str] = None
    beneficiary_ids: Optional[List[str]] = []

    @validator('asset_type')
    def validate_asset_type(cls, v):
        valid_types = ['bank_account', 'real_estate', 'investment', 'vehicle', 'cryptocurrency', 'social_media', 'cloud_storage', 'debt', 'other']
        if v not in valid_types:
            raise ValueError(f'Asset type must be one of: {", ".join(valid_types)}')
        return v

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    asset_type: Optional[str] = None
    value: Optional[float] = None
    description: Optional[str] = None
    account_number: Optional[str] = None
    institution: Optional[str] = None
    location: Optional[str] = None
    access_info: Optional[str] = None
    beneficiary_ids: Optional[List[str]] = None

class Asset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    asset_type: str
    value: Optional[float] = None
    description: Optional[str] = None
    account_number: Optional[str] = None
    institution: Optional[str] = None
    location: Optional[str] = None
    access_info: Optional[str] = None
    beneficiary_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class BeneficiaryCreate(BaseModel):
    full_name: str
    relationship: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    notes: Optional[str] = None

class BeneficiaryUpdate(BaseModel):
    full_name: Optional[str] = None
    relationship: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    notes: Optional[str] = None

class Beneficiary(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    full_name: str
    relationship: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ============================================
# PHOTO & VIDEO MODELS
# ============================================

class PhotoCreate(BaseModel):
    title: str
    description: Optional[str] = None
    file_data: str  # base64 encoded
    file_size: int

class Photo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    file_data: str
    file_size: int
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VideoCreate(BaseModel):
    title: str
    description: Optional[str] = None
    file_data: str  # base64 encoded video
    file_size: int
    duration: Optional[int] = None  # in seconds

class Video(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    file_data: str
    file_size: int
    duration: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ============================================
# HELPER FUNCTIONS
# ============================================

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get the current authenticated user from JWT token"""
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Check session timeout
    session = await db.sessions.find_one({"user_id": user_id})
    if session:
        last_activity = session.get('last_activity')
        if last_activity and (datetime.utcnow() - last_activity).seconds > ACCESS_TOKEN_EXPIRE_MINUTES * 60:
            raise HTTPException(status_code=401, detail="Session expired")
        
        # Update last activity
        await db.sessions.update_one(
            {"user_id": user_id},
            {"$set": {"last_activity": datetime.utcnow()}}
        )
    
    return User(**user)

async def log_access(user_id: str, action: str, ip_address: Optional[str] = None):
    """Log user access for security monitoring"""
    log = AccessLog(
        user_id=user_id,
        action=action,
        ip_address=ip_address
    )
    await db.access_logs.insert_one(log.dict())

def encrypt_data(data: str) -> str:
    """Encrypt data using AES-256 (Fernet)"""
    return fernet.encrypt(data.encode()).decode()

def decrypt_data(encrypted_data: str) -> str:
    """Decrypt AES-256 encrypted data"""
    return fernet.decrypt(encrypted_data.encode()).decode()

async def send_otp_notification(phone: str, otp_code: str, email: str):
    """Send OTP via Email (priority), then SMS, then console fallback"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    # Priority 1: Email OTP
    if EMAIL_ENABLED and email:
        try:
            logging.info(f"Attempting email OTP to {email} via {SMTP_EMAIL}")
            msg = MIMEMultipart('alternative')
            msg['From'] = f"Last Chapter Vault <{SMTP_EMAIL}>"
            msg['To'] = email
            msg['Subject'] = f"Last Chapter Vault - Your Verification Code: {otp_code}"
            
            html_body = f"""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; padding: 20px 0;">
                    <h1 style="color: #0F1419; margin: 0;">Last Chapter Vault</h1>
                    <p style="color: #8B949E; font-size: 14px;">Secure Estate Planning</p>
                </div>
                <div style="background: #0F1419; border-radius: 12px; padding: 32px; text-align: center;">
                    <p style="color: #8B949E; font-size: 14px; margin: 0 0 8px 0;">Your verification code is</p>
                    <h2 style="color: #4A90E2; font-size: 36px; letter-spacing: 8px; margin: 0 0 8px 0; font-family: monospace;">{otp_code}</h2>
                    <p style="color: #8B949E; font-size: 13px; margin: 0;">Valid for {OTP_EXPIRE_MINUTES} minutes</p>
                </div>
                <p style="color: #8B949E; font-size: 12px; text-align: center; margin-top: 20px;">
                    If you didn't request this code, please ignore this email.
                </p>
            </div>
            """
            
            text_body = f"Your Last Chapter Vault verification code is: {otp_code}\nValid for {OTP_EXPIRE_MINUTES} minutes.\nIf you didn't request this, ignore this email."
            
            msg.attach(MIMEText(text_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))
            
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
                server.send_message(msg)
            
            logging.info(f"Email OTP sent to {email}")
            return "email"
        except Exception as e:
            logging.error(f"Email send failed: {e}")
    
    # Priority 2: SMS via Twilio
    if TWILIO_ENABLED and phone:
        try:
            from twilio.rest import Client
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            message = client.messages.create(
                body=f"Last Chapter Vault OTP: {otp_code}. Valid for {OTP_EXPIRE_MINUTES} minutes.",
                from_=TWILIO_PHONE_NUMBER,
                to=phone
            )
            logging.info(f"SMS sent to {phone}: {message.sid}")
            return "sms"
        except Exception as e:
            logging.error(f"Twilio SMS failed: {e}")
    
    # Fallback: log to console
    logging.info(f"========== OTP for {email}: {otp_code} (valid {OTP_EXPIRE_MINUTES} min) ==========")
    return "console"

# ============================================
# AUTHENTICATION ROUTES
# ============================================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    """Register a new user"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    password_hash = hash_password(user_data.password)
    
    # Create user
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        phone=user_data.phone,
        executor_info=user_data.executor_info,
        password_hash=password_hash,
        is_verified=False  # Will be verified via OTP
    )
    
    await db.users.insert_one(user.dict())
    
    # Generate OTP for email verification
    otp_code = generate_otp()
    otp = OTP(
        email=user.email,
        otp_code=otp_code,
        expires_at=datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
    )
    await db.otps.insert_one(otp.dict())
    
    # Send OTP via SMS or console
    delivery = await send_otp_notification(user.phone or "", otp_code, user.email)
    
    # Create tokens (but user needs to verify OTP)
    access_token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    refresh_token = create_refresh_token({"sub": user.id})
    
    # Create session
    session = Session(
        user_id=user.id,
        refresh_token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    await db.sessions.insert_one(session.dict())
    
    # Log access
    await log_access(user.id, "register")
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_verified": user.is_verified,
            "dev_otp": otp_code if delivery == "console" else None
        }
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    """Login a user"""
    # Find user
    user_dict = await db.users.find_one({"email": login_data.email})
    if not user_dict:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(**user_dict)
    
    # Check if account is locked
    if user.locked_until and user.locked_until > datetime.utcnow():
        remaining = (user.locked_until - datetime.utcnow()).seconds // 60
        raise HTTPException(
            status_code=403,
            detail=f"Account locked. Try again in {remaining} minutes"
        )
    
    # Verify password
    if not verify_password(login_data.password, user.password_hash):
        # Increment failed attempts
        failed_attempts = user.failed_login_attempts + 1
        update_data = {"failed_login_attempts": failed_attempts}
        
        # Lock account after MAX_LOGIN_ATTEMPTS
        if failed_attempts >= MAX_LOGIN_ATTEMPTS:
            update_data["locked_until"] = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            await db.users.update_one({"id": user.id}, {"$set": update_data})
            raise HTTPException(
                status_code=403,
                detail=f"Account locked due to too many failed attempts. Try again in {LOCKOUT_DURATION_MINUTES} minutes"
            )
        
        await db.users.update_one({"id": user.id}, {"$set": update_data})
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Reset failed attempts on successful login
    await db.users.update_one(
        {"id": user.id},
        {"$set": {"failed_login_attempts": 0, "locked_until": None}}
    )

    # --- REVIEWER OTP BYPASS ---
    # App Store / Play Store reviewers cannot access the OTP email inbox.
    # Skip the OTP step entirely for the demo account so they can sign in cleanly.
    is_reviewer_bypass = user.email.lower() in REVIEWER_BYPASS_EMAILS
    if is_reviewer_bypass:
        # Mark user as verified so any downstream is_verified checks pass.
        await db.users.update_one(
            {"id": user.id},
            {"$set": {"is_verified": True}}
        )
        access_token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
        refresh_token = create_refresh_token({"sub": user.id})

        existing_session = await db.sessions.find_one({"user_id": user.id})
        if existing_session:
            await db.sessions.update_one(
                {"user_id": user.id},
                {"$set": {
                    "refresh_token": refresh_token,
                    "expires_at": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
                    "last_activity": datetime.utcnow()
                }}
            )
        else:
            session = Session(
                user_id=user.id,
                refresh_token=refresh_token,
                expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
            )
            await db.sessions.insert_one(session.dict())

        await log_access(user.id, "login_reviewer_bypass")

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "is_verified": True,
                "otp_required": False,   # ← tells client to skip OTP screen
                "dev_otp": None
            }
        )

    # Generate OTP for 2FA
    otp_code = generate_otp()
    otp = OTP(
        email=user.email,
        otp_code=otp_code,
        expires_at=datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
    )
    await db.otps.insert_one(otp.dict())
    
    # Send OTP via SMS or console
    delivery = await send_otp_notification(user.phone or "", otp_code, user.email)
    
    # Create tokens
    access_token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    refresh_token = create_refresh_token({"sub": user.id})
    
    # Create or update session
    existing_session = await db.sessions.find_one({"user_id": user.id})
    if existing_session:
        await db.sessions.update_one(
            {"user_id": user.id},
            {"$set": {
                "refresh_token": refresh_token,
                "expires_at": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
                "last_activity": datetime.utcnow()
            }}
        )
    else:
        session = Session(
            user_id=user.id,
            refresh_token=refresh_token,
            expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        )
        await db.sessions.insert_one(session.dict())
    
    # Log access
    await log_access(user.id, "login")
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_verified": user.is_verified,
            "dev_otp": otp_code if delivery == "console" else None
        }
    )

@api_router.post("/auth/verify-otp")
async def verify_otp(otp_data: OTPVerify):
    """Verify OTP for 2FA"""
    # Find OTP
    otp_dict = await db.otps.find_one({
        "email": otp_data.email,
        "otp_code": otp_data.otp,
        "used": False
    })
    
    if not otp_dict:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    otp = OTP(**otp_dict)
    
    # Check if expired
    if otp.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")
    
    # Mark OTP as used
    await db.otps.update_one(
        {"id": otp.id},
        {"$set": {"used": True}}
    )
    
    # Mark user as verified
    await db.users.update_one(
        {"email": otp_data.email},
        {"$set": {"is_verified": True}}
    )
    
    return {"message": "OTP verified successfully", "verified": True}

@api_router.post("/auth/resend-otp")
async def resend_otp(otp_request: OTPRequest):
    """Resend OTP"""
    # Check if user exists
    user = await db.users.find_one({"email": otp_request.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate new OTP
    otp_code = generate_otp()
    otp = OTP(
        email=otp_request.email,
        otp_code=otp_code,
        expires_at=datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
    )
    await db.otps.insert_one(otp.dict())
    
    # Send OTP via SMS or console
    delivery = await send_otp_notification(user.get("phone", ""), otp_code, otp_request.email)
    
    return {"message": "OTP sent successfully", "dev_otp": otp_code if delivery == "console" else None}

# --- Forgot / Reset Password ---

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v

@api_router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """Send OTP for password reset"""
    user = await db.users.find_one({"email": req.email})
    if not user:
        # Don't reveal if email exists or not (security best practice)
        return {"message": "If an account exists with this email, an OTP has been sent", "dev_otp": None}
    
    otp_code = generate_otp()
    otp = OTP(
        email=req.email,
        otp_code=otp_code,
        expires_at=datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
    )
    await db.otps.insert_one(otp.dict())
    
    delivery = await send_otp_notification(user.get("phone", ""), otp_code, req.email)
    
    return {
        "message": "If an account exists with this email, an OTP has been sent",
        "dev_otp": otp_code if delivery == "console" else None
    }

@api_router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    """Reset password using OTP"""
    # Verify OTP
    otp_dict = await db.otps.find_one({
        "email": req.email,
        "otp_code": req.otp,
        "used": False
    })
    
    if not otp_dict:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    if datetime.utcnow() > otp_dict["expires_at"]:
        raise HTTPException(status_code=400, detail="OTP has expired")
    
    # Mark OTP as used
    await db.otps.update_one({"id": otp_dict["id"]}, {"$set": {"used": True}})
    
    # Update password
    user = await db.users.find_one({"email": req.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_hash = hash_password(req.new_password)
    await db.users.update_one(
        {"email": req.email},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.utcnow(), "failed_login_attempts": 0, "locked_until": None}}
    )
    
    await log_access(user["id"], "reset_password")
    return {"message": "Password reset successfully. You can now login with your new password."}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "phone": current_user.phone,
        "executor_info": current_user.executor_info,
        "is_verified": current_user.is_verified
    }

@api_router.post("/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout user"""
    # Delete session
    await db.sessions.delete_one({"user_id": current_user.id})
    
    # Log access
    await log_access(current_user.id, "logout")
    
    return {"message": "Logged out successfully"}


class RefreshRequest(BaseModel):
    refresh_token: str


@api_router.post("/auth/refresh")
async def refresh_access_token(req: RefreshRequest):
    """Exchange a valid refresh token for a fresh access token.

    Allows clients to silently extend their session before the access token
    expires (8 hours) — critical for long media uploads where the token would
    otherwise expire mid-flight and force the user back to the login screen.
    """
    try:
        payload = jwt.decode(req.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if not user_id or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token has expired — please sign in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Verify session still exists and matches
    session = await db.sessions.find_one({"user_id": user_id, "refresh_token": req.refresh_token})
    if not session:
        raise HTTPException(status_code=401, detail="Session not found — please sign in again")

    if session.get("expires_at") and session["expires_at"] < datetime.utcnow():
        await db.sessions.delete_one({"user_id": user_id})
        raise HTTPException(status_code=401, detail="Session expired — please sign in again")

    # Fetch user
    user_dict = await db.users.find_one({"id": user_id})
    if not user_dict:
        raise HTTPException(status_code=401, detail="User not found")
    user = User(**user_dict)

    # Mint new access token (keep same refresh token until logout)
    new_access_token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})

    # Touch session
    await db.sessions.update_one(
        {"user_id": user_id},
        {"$set": {"last_activity": datetime.utcnow()}}
    )

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in_minutes": ACCESS_TOKEN_EXPIRE_MINUTES,
    }


# ============================================
# DOCUMENT MANAGEMENT ROUTES
# ============================================

@api_router.post("/documents", response_model=Document)
async def create_document(doc_data: DocumentCreate, current_user: User = Depends(get_current_user)):
    """Create a new document"""
    # Create document
    document = Document(
        user_id=current_user.id,
        title=doc_data.title,
        category=doc_data.category,
        description=doc_data.description,
        file_data=doc_data.file_data,
        file_name=doc_data.file_name,
        file_type=doc_data.file_type,
        file_size=doc_data.file_size
    )
    
    await db.documents.insert_one(document.dict())
    
    # Log access
    await log_access(current_user.id, f"create_document: {doc_data.title}")
    
    return document

@api_router.get("/documents", response_model=List[Document])
async def get_documents(
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all documents for the current user with optional filtering"""
    query = {"user_id": current_user.id}
    
    if category:
        query["category"] = category
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"file_name": {"$regex": search, "$options": "i"}}
        ]
    
    documents = await db.documents.find(query).sort("created_at", -1).to_list(1000)
    return [Document(**doc) for doc in documents]

@api_router.get("/documents/{document_id}", response_model=Document)
async def get_document(document_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific document"""
    document = await db.documents.find_one({"id": document_id, "user_id": current_user.id})
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return Document(**document)

@api_router.patch("/documents/{document_id}", response_model=Document)
async def update_document(
    document_id: str,
    doc_update: DocumentUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a document"""
    document = await db.documents.find_one({"id": document_id, "user_id": current_user.id})
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Update fields
    update_data = {k: v for k, v in doc_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.documents.update_one(
        {"id": document_id},
        {"$set": update_data}
    )
    
    # Get updated document
    updated_doc = await db.documents.find_one({"id": document_id})
    
    # Log access
    await log_access(current_user.id, f"update_document: {document_id}")
    
    return Document(**updated_doc)

@api_router.delete("/documents/{document_id}")
async def delete_document(document_id: str, current_user: User = Depends(get_current_user)):
    """Delete a document"""
    document = await db.documents.find_one({"id": document_id, "user_id": current_user.id})
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await db.documents.delete_one({"id": document_id})
    
    # Log access
    await log_access(current_user.id, f"delete_document: {document_id}")
    
    return {"message": "Document deleted successfully"}

@api_router.get("/documents/stats/summary")
async def get_document_stats(current_user: User = Depends(get_current_user)):
    """Get document statistics for the user"""
    total_documents = await db.documents.count_documents({"user_id": current_user.id})
    
    # Count by category
    pipeline = [
        {"$match": {"user_id": current_user.id}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    
    category_counts = {}
    async for result in db.documents.aggregate(pipeline):
        category_counts[result["_id"]] = result["count"]
    
    # Calculate total size
    total_size = 0
    async for doc in db.documents.find({"user_id": current_user.id}):
        total_size += doc.get("file_size", 0)
    
    return {
        "total_documents": total_documents,
        "by_category": category_counts,
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2)
    }

# ============================================
# ASSET MANAGEMENT ROUTES
# ============================================

@api_router.post("/assets", response_model=Asset)
async def create_asset(asset_data: AssetCreate, current_user: User = Depends(get_current_user)):
    """Create a new asset"""
    asset = Asset(
        user_id=current_user.id,
        name=asset_data.name,
        asset_type=asset_data.asset_type,
        value=asset_data.value,
        description=asset_data.description,
        account_number=asset_data.account_number,
        institution=asset_data.institution,
        location=asset_data.location,
        access_info=asset_data.access_info,
        beneficiary_ids=asset_data.beneficiary_ids or []
    )
    
    await db.assets.insert_one(asset.dict())
    await log_access(current_user.id, f"create_asset: {asset_data.name}")
    
    return asset

@api_router.get("/assets", response_model=List[Asset])
async def get_assets(
    asset_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all assets for the current user with optional filtering"""
    query = {"user_id": current_user.id}
    
    if asset_type:
        query["asset_type"] = asset_type
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"institution": {"$regex": search, "$options": "i"}}
        ]
    
    assets = await db.assets.find(query).sort("created_at", -1).to_list(1000)
    return [Asset(**asset) for asset in assets]

@api_router.get("/assets/{asset_id}", response_model=Asset)
async def get_asset(asset_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific asset"""
    asset = await db.assets.find_one({"id": asset_id, "user_id": current_user.id})
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    return Asset(**asset)

@api_router.patch("/assets/{asset_id}", response_model=Asset)
async def update_asset(
    asset_id: str,
    asset_update: AssetUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update an asset"""
    asset = await db.assets.find_one({"id": asset_id, "user_id": current_user.id})
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    update_data = {k: v for k, v in asset_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.assets.update_one(
        {"id": asset_id},
        {"$set": update_data}
    )
    
    updated_asset = await db.assets.find_one({"id": asset_id})
    await log_access(current_user.id, f"update_asset: {asset_id}")
    
    return Asset(**updated_asset)

@api_router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, current_user: User = Depends(get_current_user)):
    """Delete an asset"""
    asset = await db.assets.find_one({"id": asset_id, "user_id": current_user.id})
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    await db.assets.delete_one({"id": asset_id})
    await log_access(current_user.id, f"delete_asset: {asset_id}")
    
    return {"message": "Asset deleted successfully"}

@api_router.get("/assets/stats/summary")
async def get_asset_stats(current_user: User = Depends(get_current_user)):
    """Get asset statistics for the user"""
    total_assets = await db.assets.count_documents({"user_id": current_user.id})
    
    # Count by type
    pipeline = [
        {"$match": {"user_id": current_user.id}},
        {"$group": {"_id": "$asset_type", "count": {"$sum": 1}, "total_value": {"$sum": "$value"}}}
    ]
    
    type_counts = {}
    total_value = 0
    async for result in db.assets.aggregate(pipeline):
        type_counts[result["_id"]] = {
            "count": result["count"],
            "total_value": result.get("total_value") or 0
        }
        total_value += result.get("total_value") or 0
    
    return {
        "total_assets": total_assets,
        "by_type": type_counts,
        "total_value": round(total_value, 2)
    }

# ============================================
# BENEFICIARY MANAGEMENT ROUTES
# ============================================

@api_router.post("/beneficiaries", response_model=Beneficiary)
async def create_beneficiary(beneficiary_data: BeneficiaryCreate, current_user: User = Depends(get_current_user)):
    """Create a new beneficiary"""
    beneficiary = Beneficiary(
        user_id=current_user.id,
        full_name=beneficiary_data.full_name,
        relationship=beneficiary_data.relationship,
        email=beneficiary_data.email,
        phone=beneficiary_data.phone,
        address=beneficiary_data.address,
        date_of_birth=beneficiary_data.date_of_birth,
        notes=beneficiary_data.notes
    )
    
    await db.beneficiaries.insert_one(beneficiary.dict())
    await log_access(current_user.id, f"create_beneficiary: {beneficiary_data.full_name}")
    
    return beneficiary

@api_router.get("/beneficiaries", response_model=List[Beneficiary])
async def get_beneficiaries(
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all beneficiaries for the current user"""
    query = {"user_id": current_user.id}
    
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"relationship": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    beneficiaries = await db.beneficiaries.find(query).sort("created_at", -1).to_list(1000)
    return [Beneficiary(**ben) for ben in beneficiaries]

@api_router.get("/beneficiaries/{beneficiary_id}", response_model=Beneficiary)
async def get_beneficiary(beneficiary_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific beneficiary"""
    beneficiary = await db.beneficiaries.find_one({"id": beneficiary_id, "user_id": current_user.id})
    
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    
    return Beneficiary(**beneficiary)

@api_router.patch("/beneficiaries/{beneficiary_id}", response_model=Beneficiary)
async def update_beneficiary(
    beneficiary_id: str,
    beneficiary_update: BeneficiaryUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a beneficiary"""
    beneficiary = await db.beneficiaries.find_one({"id": beneficiary_id, "user_id": current_user.id})
    
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    
    update_data = {k: v for k, v in beneficiary_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.beneficiaries.update_one(
        {"id": beneficiary_id},
        {"$set": update_data}
    )
    
    updated_beneficiary = await db.beneficiaries.find_one({"id": beneficiary_id})
    await log_access(current_user.id, f"update_beneficiary: {beneficiary_id}")
    
    return Beneficiary(**updated_beneficiary)

@api_router.delete("/beneficiaries/{beneficiary_id}")
async def delete_beneficiary(beneficiary_id: str, current_user: User = Depends(get_current_user)):
    """Delete a beneficiary"""
    beneficiary = await db.beneficiaries.find_one({"id": beneficiary_id, "user_id": current_user.id})
    
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    
    # Remove beneficiary from all assets
    await db.assets.update_many(
        {"user_id": current_user.id},
        {"$pull": {"beneficiary_ids": beneficiary_id}}
    )
    
    await db.beneficiaries.delete_one({"id": beneficiary_id})
    await log_access(current_user.id, f"delete_beneficiary: {beneficiary_id}")
    
    return {"message": "Beneficiary deleted successfully"}

# ============================================
# PHOTO MANAGEMENT ROUTES
# ============================================

@api_router.post("/photos", response_model=Photo)
async def create_photo(photo_data: PhotoCreate, current_user: User = Depends(get_current_user)):
    """Upload a photo"""
    photo = Photo(
        user_id=current_user.id,
        title=photo_data.title,
        description=photo_data.description,
        file_data=photo_data.file_data,
        file_size=photo_data.file_size
    )
    
    await db.photos.insert_one(photo.dict())
    await log_access(current_user.id, f"create_photo: {photo_data.title}")
    
    return photo

@api_router.get("/photos", response_model=List[Photo])
async def get_photos(current_user: User = Depends(get_current_user)):
    """Get all photos for the current user"""
    photos = await db.photos.find({"user_id": current_user.id}).sort("created_at", -1).to_list(1000)
    return [Photo(**photo) for photo in photos]

@api_router.get("/photos/{photo_id}", response_model=Photo)
async def get_photo(photo_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific photo"""
    photo = await db.photos.find_one({"id": photo_id, "user_id": current_user.id})
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    return Photo(**photo)

@api_router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str, current_user: User = Depends(get_current_user)):
    """Delete a photo"""
    photo = await db.photos.find_one({"id": photo_id, "user_id": current_user.id})
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    await db.photos.delete_one({"id": photo_id})
    await log_access(current_user.id, f"delete_photo: {photo_id}")
    
    return {"message": "Photo deleted successfully"}

# ============================================
# FAREWELL VIDEO ROUTES
# ============================================

@api_router.post("/farewell-video", response_model=Video)
async def create_farewell_video(video_data: VideoCreate, current_user: User = Depends(get_current_user)):
    """Upload farewell video (replaces existing if any)"""
    # Delete existing farewell video
    await db.farewell_videos.delete_many({"user_id": current_user.id})
    
    video = Video(
        user_id=current_user.id,
        title=video_data.title,
        description=video_data.description,
        file_data=video_data.file_data,
        file_size=video_data.file_size,
        duration=video_data.duration
    )
    
    await db.farewell_videos.insert_one(video.dict())
    await log_access(current_user.id, "upload_farewell_video")
    
    return video

@api_router.get("/farewell-video", response_model=Optional[Video])
async def get_farewell_video(current_user: User = Depends(get_current_user)):
    """Get farewell video"""
    video = await db.farewell_videos.find_one({"user_id": current_user.id})
    
    if not video:
        return None
    
    return Video(**video)

@api_router.delete("/farewell-video")
async def delete_farewell_video(current_user: User = Depends(get_current_user)):
    """Delete farewell video"""
    video = await db.farewell_videos.find_one({"user_id": current_user.id})
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    await db.farewell_videos.delete_one({"user_id": current_user.id})
    await log_access(current_user.id, "delete_farewell_video")
    
    return {"message": "Farewell video deleted successfully"}

# ============================================
# SETTINGS / PROFILE ROUTES
# ============================================

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v

@api_router.patch("/auth/profile")
async def update_profile(profile_data: ProfileUpdate, current_user: User = Depends(get_current_user)):
    """Update user profile"""
    update_fields = {}
    if profile_data.full_name is not None:
        if len(profile_data.full_name.strip()) < 2:
            raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
        update_fields["full_name"] = profile_data.full_name.strip()
    if profile_data.phone is not None:
        update_fields["phone"] = profile_data.phone.strip() if profile_data.phone.strip() else None
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_fields["updated_at"] = datetime.utcnow()
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": update_fields}
    )
    
    await log_access(current_user.id, "update_profile")
    
    updated_user = await db.users.find_one({"id": current_user.id})
    user_dict = {k: v for k, v in updated_user.items() if k not in ['_id', 'password_hash']}
    return {"message": "Profile updated successfully", "user": user_dict}

@api_router.post("/auth/change-password")
async def change_password(password_data: PasswordChange, current_user: User = Depends(get_current_user)):
    """Change user password"""
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Hash new password
    new_hash = hash_password(password_data.new_password)
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"password_hash": new_hash, "updated_at": datetime.utcnow()}}
    )
    
    await log_access(current_user.id, "change_password")
    return {"message": "Password changed successfully"}

@api_router.get("/auth/access-logs")
async def get_access_logs(limit: int = 50, current_user: User = Depends(get_current_user)):
    """Get user access logs"""
    logs = await db.access_logs.find(
        {"user_id": current_user.id}
    ).sort("timestamp", -1).limit(limit).to_list(length=limit)
    
    result = []
    for log in logs:
        result.append({
            "id": log.get("id"),
            "action": log.get("action"),
            "timestamp": log.get("timestamp"),
            "ip_address": log.get("ip_address"),
        })
    
    return result

@api_router.get("/export")
async def export_user_data(current_user: User = Depends(get_current_user)):
    """Export all user data as JSON"""
    # Get user info (without password)
    user_info = {
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "phone": current_user.phone,
        "is_verified": current_user.is_verified,
        "created_at": str(current_user.created_at),
    }
    
    # Get documents (without file data to keep export small)
    documents = []
    async for doc in db.documents.find({"user_id": current_user.id}):
        documents.append({
            "title": doc.get("title"),
            "category": doc.get("category"),
            "description": doc.get("description"),
            "file_name": doc.get("file_name"),
            "file_type": doc.get("file_type"),
            "file_size": doc.get("file_size"),
            "created_at": str(doc.get("created_at")),
        })
    
    # Get assets
    assets = []
    async for asset in db.assets.find({"user_id": current_user.id}):
        assets.append({
            "name": asset.get("name"),
            "asset_type": asset.get("asset_type"),
            "value": asset.get("value"),
            "institution": asset.get("institution"),
            "account_number": asset.get("account_number"),
            "notes": asset.get("notes"),
            "created_at": str(asset.get("created_at")),
        })
    
    # Get beneficiaries
    beneficiaries = []
    async for b in db.beneficiaries.find({"user_id": current_user.id}):
        beneficiaries.append({
            "full_name": b.get("full_name"),
            "relationship": b.get("relationship"),
            "email": b.get("email"),
            "phone": b.get("phone"),
            "address": b.get("address"),
            "notes": b.get("notes"),
            "created_at": str(b.get("created_at")),
        })
    
    # Get photo metadata (without file data)
    photos = []
    async for p in db.photos.find({"user_id": current_user.id}):
        photos.append({
            "title": p.get("title"),
            "description": p.get("description"),
            "file_size": p.get("file_size"),
            "created_at": str(p.get("created_at")),
        })
    
    # Get video metadata
    video = await db.farewell_videos.find_one({"user_id": current_user.id})
    farewell_video = None
    if video:
        farewell_video = {
            "title": video.get("title"),
            "description": video.get("description"),
            "duration": video.get("duration"),
            "created_at": str(video.get("created_at")),
        }
    
    # Get access logs
    logs = await db.access_logs.find(
        {"user_id": current_user.id}
    ).sort("timestamp", -1).limit(100).to_list(length=100)
    
    access_logs = []
    for log in logs:
        access_logs.append({
            "action": log.get("action"),
            "timestamp": str(log.get("timestamp")),
        })
    
    await log_access(current_user.id, "export_data")
    
    return {
        "export_date": str(datetime.utcnow()),
        "user": user_info,
        "documents": documents,
        "assets": assets,
        "beneficiaries": beneficiaries,
        "photos": photos,
        "farewell_video": farewell_video,
        "access_logs": access_logs,
        "summary": {
            "total_documents": len(documents),
            "total_assets": len(assets),
            "total_beneficiaries": len(beneficiaries),
            "total_photos": len(photos),
            "has_farewell_video": farewell_video is not None,
        }
    }

# ============================================
# EXECUTOR FEATURES
# ============================================

TASK_TEMPLATES = [
    {"title": "Obtain death certificates", "description": "Get multiple certified copies of the death certificate from the vital records office.", "category": "immediate", "priority": "high", "days_offset": 3},
    {"title": "Secure the property", "description": "Change locks, secure valuables, and ensure the deceased's property is protected.", "category": "immediate", "priority": "high", "days_offset": 2},
    {"title": "Notify close family & friends", "description": "Inform close family members and friends of the passing.", "category": "immediate", "priority": "high", "days_offset": 1},
    {"title": "Locate the will", "description": "Find the original will and any trust documents. Check with attorney, safe deposit box, or home safe.", "category": "legal", "priority": "high", "days_offset": 7},
    {"title": "File will with probate court", "description": "Submit the original will to the local probate court to begin the probate process.", "category": "legal", "priority": "high", "days_offset": 30},
    {"title": "Open estate bank account", "description": "Open a dedicated bank account for the estate to manage income and expenses.", "category": "financial", "priority": "high", "days_offset": 14},
    {"title": "Notify Social Security", "description": "Report the death to the Social Security Administration. Benefits may need to be repaid.", "category": "notifications", "priority": "medium", "days_offset": 7},
    {"title": "Contact life insurance companies", "description": "File claims with all life insurance companies. Gather policy numbers and beneficiary info.", "category": "financial", "priority": "high", "days_offset": 14},
    {"title": "Notify employer & benefits", "description": "Contact the employer regarding final paycheck, retirement benefits, and group insurance.", "category": "notifications", "priority": "medium", "days_offset": 10},
    {"title": "Inventory all assets", "description": "Create a comprehensive list of all assets including bank accounts, investments, real estate, vehicles, and personal property.", "category": "financial", "priority": "high", "days_offset": 30},
    {"title": "Notify creditors", "description": "Send formal notice to known creditors. Publish notice in local newspaper if required by state law.", "category": "notifications", "priority": "medium", "days_offset": 30},
    {"title": "Cancel subscriptions & memberships", "description": "Cancel recurring subscriptions, memberships, and auto-payments.", "category": "notifications", "priority": "low", "days_offset": 30},
    {"title": "File final income tax return", "description": "File the deceased's final Form 1040 for income earned through date of death.", "category": "tax", "priority": "high", "days_offset": 120},
    {"title": "File estate tax return", "description": "If the estate exceeds the federal exemption, file Form 706 within 9 months of death.", "category": "tax", "priority": "medium", "days_offset": 270},
    {"title": "Pay outstanding debts", "description": "Settle valid claims and debts from estate funds. Prioritize secured debts and taxes.", "category": "financial", "priority": "medium", "days_offset": 90},
    {"title": "Distribute assets to beneficiaries", "description": "After all debts are paid and court approval received, distribute remaining assets per the will.", "category": "distribution", "priority": "high", "days_offset": 180},
    {"title": "Close estate accounts", "description": "Close all estate bank accounts and finalize all financial matters.", "category": "financial", "priority": "medium", "days_offset": 365},
    {"title": "File final accounting with court", "description": "Submit a detailed accounting of all estate transactions to the probate court for approval.", "category": "legal", "priority": "high", "days_offset": 365},
]

class ExecutorTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "other"
    priority: str = "medium"
    due_date: Optional[str] = None
    notes: Optional[str] = None

class ExecutorTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None

class ExecutorTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    category: str = "other"
    priority: str = "medium"
    status: str = "pending"
    due_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AccountingEntryCreate(BaseModel):
    entry_type: str  # income, expense, distribution
    amount: float
    description: str
    category: Optional[str] = None
    date: Optional[str] = None

class AccountingEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    entry_type: str
    amount: float
    description: str
    category: Optional[str] = None
    date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProfessionalCreate(BaseModel):
    name: str
    profession: str  # attorney, accountant, financial_advisor, insurance_agent, other
    specialty: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class Professional(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    profession: str
    specialty: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# --- Executor Tasks ---

@api_router.post("/executor/tasks/init")
async def init_executor_tasks(current_user: User = Depends(get_current_user)):
    """Initialize default executor task checklist from templates"""
    existing = await db.executor_tasks.count_documents({"user_id": current_user.id})
    if existing > 0:
        raise HTTPException(status_code=400, detail="Tasks already initialized. Use individual task creation to add more.")
    
    tasks = []
    for t in TASK_TEMPLATES:
        due = (datetime.utcnow() + timedelta(days=t["days_offset"])).strftime("%Y-%m-%d")
        task = ExecutorTask(
            user_id=current_user.id,
            title=t["title"],
            description=t["description"],
            category=t["category"],
            priority=t["priority"],
            due_date=due,
        )
        tasks.append(task.dict())
    
    await db.executor_tasks.insert_many(tasks)
    await log_access(current_user.id, "init_executor_tasks")
    return {"message": f"{len(tasks)} tasks created", "count": len(tasks)}

@api_router.get("/executor/tasks")
async def get_executor_tasks(status: Optional[str] = None, category: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Get executor tasks with optional filters"""
    query = {"user_id": current_user.id}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    
    tasks = await db.executor_tasks.find(query).sort("due_date", 1).to_list(length=200)
    result = []
    for t in tasks:
        t.pop('_id', None)
        result.append(t)
    return result

@api_router.post("/executor/tasks")
async def create_executor_task(task_data: ExecutorTaskCreate, current_user: User = Depends(get_current_user)):
    """Create a single executor task"""
    task = ExecutorTask(
        user_id=current_user.id,
        title=task_data.title,
        description=task_data.description,
        category=task_data.category,
        priority=task_data.priority,
        due_date=task_data.due_date,
        notes=task_data.notes,
    )
    await db.executor_tasks.insert_one(task.dict())
    await log_access(current_user.id, f"create_executor_task: {task_data.title}")
    return task

@api_router.patch("/executor/tasks/{task_id}")
async def update_executor_task(task_id: str, task_data: ExecutorTaskUpdate, current_user: User = Depends(get_current_user)):
    """Update an executor task (e.g., mark as completed)"""
    task = await db.executor_tasks.find_one({"id": task_id, "user_id": current_user.id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_fields = {}
    for field, value in task_data.dict(exclude_none=True).items():
        update_fields[field] = value
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_fields["updated_at"] = datetime.utcnow()
    await db.executor_tasks.update_one({"id": task_id}, {"$set": update_fields})
    await log_access(current_user.id, f"update_executor_task: {task_id}")
    
    updated = await db.executor_tasks.find_one({"id": task_id})
    updated.pop('_id', None)
    return updated

@api_router.delete("/executor/tasks/{task_id}")
async def delete_executor_task(task_id: str, current_user: User = Depends(get_current_user)):
    """Delete an executor task"""
    task = await db.executor_tasks.find_one({"id": task_id, "user_id": current_user.id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.executor_tasks.delete_one({"id": task_id})
    await log_access(current_user.id, f"delete_executor_task: {task_id}")
    return {"message": "Task deleted successfully"}

@api_router.get("/executor/tasks/stats")
async def get_executor_task_stats(current_user: User = Depends(get_current_user)):
    """Get executor task statistics"""
    total = await db.executor_tasks.count_documents({"user_id": current_user.id})
    pending = await db.executor_tasks.count_documents({"user_id": current_user.id, "status": "pending"})
    in_progress = await db.executor_tasks.count_documents({"user_id": current_user.id, "status": "in_progress"})
    completed = await db.executor_tasks.count_documents({"user_id": current_user.id, "status": "completed"})
    
    # Overdue tasks
    today = datetime.utcnow().strftime("%Y-%m-%d")
    overdue = await db.executor_tasks.count_documents({
        "user_id": current_user.id,
        "status": {"$ne": "completed"},
        "due_date": {"$lt": today, "$ne": None}
    })
    
    return {
        "total": total,
        "pending": pending,
        "in_progress": in_progress,
        "completed": completed,
        "overdue": overdue,
        "completion_rate": round((completed / total * 100) if total > 0 else 0, 1)
    }

# --- Fiduciary Accounting ---

@api_router.post("/executor/accounting")
async def create_accounting_entry(entry_data: AccountingEntryCreate, current_user: User = Depends(get_current_user)):
    """Create a fiduciary accounting entry"""
    if entry_data.entry_type not in ['income', 'expense', 'distribution']:
        raise HTTPException(status_code=400, detail="entry_type must be income, expense, or distribution")
    
    entry = AccountingEntry(
        user_id=current_user.id,
        entry_type=entry_data.entry_type,
        amount=entry_data.amount,
        description=entry_data.description,
        category=entry_data.category,
        date=entry_data.date or datetime.utcnow().strftime("%Y-%m-%d"),
    )
    await db.accounting_entries.insert_one(entry.dict())
    await log_access(current_user.id, f"create_accounting_entry: {entry_data.description}")
    return entry

@api_router.get("/executor/accounting")
async def get_accounting_entries(current_user: User = Depends(get_current_user)):
    """Get all accounting entries"""
    entries = await db.accounting_entries.find({"user_id": current_user.id}).sort("date", -1).to_list(length=500)
    result = []
    for e in entries:
        e.pop('_id', None)
        result.append(e)
    return result

@api_router.get("/executor/accounting/summary")
async def get_accounting_summary(current_user: User = Depends(get_current_user)):
    """Get fiduciary accounting summary"""
    entries = await db.accounting_entries.find({"user_id": current_user.id}).to_list(length=500)
    
    total_income = sum(e["amount"] for e in entries if e["entry_type"] == "income")
    total_expenses = sum(e["amount"] for e in entries if e["entry_type"] == "expense")
    total_distributions = sum(e["amount"] for e in entries if e["entry_type"] == "distribution")
    balance = total_income - total_expenses - total_distributions
    
    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "total_distributions": round(total_distributions, 2),
        "balance": round(balance, 2),
        "total_entries": len(entries),
    }

@api_router.delete("/executor/accounting/{entry_id}")
async def delete_accounting_entry(entry_id: str, current_user: User = Depends(get_current_user)):
    """Delete an accounting entry"""
    entry = await db.accounting_entries.find_one({"id": entry_id, "user_id": current_user.id})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    await db.accounting_entries.delete_one({"id": entry_id})
    await log_access(current_user.id, f"delete_accounting_entry: {entry_id}")
    return {"message": "Entry deleted successfully"}

# --- Professional Directory ---

@api_router.post("/executor/professionals")
async def create_professional(pro_data: ProfessionalCreate, current_user: User = Depends(get_current_user)):
    """Add a professional contact"""
    pro = Professional(
        user_id=current_user.id,
        name=pro_data.name,
        profession=pro_data.profession,
        specialty=pro_data.specialty,
        phone=pro_data.phone,
        email=pro_data.email,
        company=pro_data.company,
        address=pro_data.address,
        notes=pro_data.notes,
    )
    await db.professionals.insert_one(pro.dict())
    await log_access(current_user.id, f"add_professional: {pro_data.name}")
    return pro

@api_router.get("/executor/professionals")
async def get_professionals(profession: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Get professional contacts"""
    query = {"user_id": current_user.id}
    if profession:
        query["profession"] = profession
    pros = await db.professionals.find(query).sort("name", 1).to_list(length=100)
    result = []
    for p in pros:
        p.pop('_id', None)
        result.append(p)
    return result

@api_router.delete("/executor/professionals/{pro_id}")
async def delete_professional(pro_id: str, current_user: User = Depends(get_current_user)):
    """Delete a professional contact"""
    pro = await db.professionals.find_one({"id": pro_id, "user_id": current_user.id})
    if not pro:
        raise HTTPException(status_code=404, detail="Professional not found")
    await db.professionals.delete_one({"id": pro_id})
    await log_access(current_user.id, f"delete_professional: {pro_id}")
    return {"message": "Professional deleted successfully"}

# ============================================
# DEAD MAN'S SWITCH & SECURITY
# ============================================

class DeadManSwitchConfig(BaseModel):
    enabled: bool = False
    inactivity_days: int = 30  # days before switch triggers
    executor_email: Optional[str] = None
    executor_phone: Optional[str] = None
    message: Optional[str] = None

class EncryptDocumentRequest(BaseModel):
    document_id: str

@api_router.get("/security/dead-man-switch")
async def get_dead_man_switch(current_user: User = Depends(get_current_user)):
    """Get Dead Man's Switch configuration"""
    config = await db.dead_man_switch.find_one({"user_id": current_user.id})
    if not config:
        return {
            "enabled": False,
            "inactivity_days": 30,
            "executor_email": None,
            "executor_phone": None,
            "message": None,
            "last_checkin": str(current_user.updated_at) if current_user.updated_at else None,
            "days_since_checkin": 0,
        }
    config.pop('_id', None)
    
    # Calculate days since last activity
    last_session = await db.sessions.find_one({"user_id": current_user.id})
    last_activity = last_session.get('last_activity', current_user.updated_at) if last_session else current_user.updated_at
    days_since = (datetime.utcnow() - last_activity).days if last_activity else 0
    
    config["last_checkin"] = str(last_activity) if last_activity else None
    config["days_since_checkin"] = days_since
    config["is_triggered"] = days_since >= config.get("inactivity_days", 30) and config.get("enabled", False)
    return config

@api_router.post("/security/dead-man-switch")
async def update_dead_man_switch(config: DeadManSwitchConfig, current_user: User = Depends(get_current_user)):
    """Configure Dead Man's Switch"""
    if config.inactivity_days < 7:
        raise HTTPException(status_code=400, detail="Minimum inactivity period is 7 days")
    if config.inactivity_days > 365:
        raise HTTPException(status_code=400, detail="Maximum inactivity period is 365 days")
    
    switch_data = {
        "user_id": current_user.id,
        "enabled": config.enabled,
        "inactivity_days": config.inactivity_days,
        "executor_email": config.executor_email,
        "executor_phone": config.executor_phone,
        "message": config.message or f"This is an automated message from Last Chapter Vault. {current_user.full_name} has not accessed their vault in {config.inactivity_days} days. As a designated contact, you may need to check on them.",
        "updated_at": datetime.utcnow(),
    }
    
    await db.dead_man_switch.update_one(
        {"user_id": current_user.id},
        {"$set": switch_data},
        upsert=True
    )
    
    await log_access(current_user.id, f"update_dead_man_switch: {'enabled' if config.enabled else 'disabled'}")
    return {"message": "Dead Man's Switch updated", **switch_data}

@api_router.post("/security/checkin")
async def dead_man_switch_checkin(current_user: User = Depends(get_current_user)):
    """Manual check-in to reset the Dead Man's Switch timer"""
    await db.sessions.update_one(
        {"user_id": current_user.id},
        {"$set": {"last_activity": datetime.utcnow()}},
        upsert=True
    )
    await log_access(current_user.id, "dead_man_switch_checkin")
    return {"message": "Check-in successful", "timestamp": str(datetime.utcnow())}

@api_router.post("/security/encrypt-document")
async def encrypt_document(req: EncryptDocumentRequest, current_user: User = Depends(get_current_user)):
    """Encrypt a document's file data with AES-256"""
    doc = await db.documents.find_one({"id": req.document_id, "user_id": current_user.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if doc.get("is_encrypted"):
        raise HTTPException(status_code=400, detail="Document is already encrypted")
    
    try:
        encrypted = encrypt_data(doc["file_data"])
        await db.documents.update_one(
            {"id": req.document_id},
            {"$set": {"file_data": encrypted, "is_encrypted": True, "updated_at": datetime.utcnow()}}
        )
        await log_access(current_user.id, f"encrypt_document: {req.document_id}")
        return {"message": "Document encrypted successfully", "document_id": req.document_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Encryption failed: {str(e)}")

@api_router.post("/security/decrypt-document")
async def decrypt_document(req: EncryptDocumentRequest, current_user: User = Depends(get_current_user)):
    """Decrypt a document's file data"""
    doc = await db.documents.find_one({"id": req.document_id, "user_id": current_user.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not doc.get("is_encrypted"):
        raise HTTPException(status_code=400, detail="Document is not encrypted")
    
    try:
        decrypted = decrypt_data(doc["file_data"])
        await db.documents.update_one(
            {"id": req.document_id},
            {"$set": {"file_data": decrypted, "is_encrypted": False, "updated_at": datetime.utcnow()}}
        )
        await log_access(current_user.id, f"decrypt_document: {req.document_id}")
        return {"message": "Document decrypted successfully", "document_id": req.document_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decryption failed: {str(e)}")

@api_router.get("/security/encryption-status")
async def get_encryption_status(current_user: User = Depends(get_current_user)):
    """Get encryption status of all documents"""
    total = await db.documents.count_documents({"user_id": current_user.id})
    encrypted = await db.documents.count_documents({"user_id": current_user.id, "is_encrypted": True})
    return {
        "total_documents": total,
        "encrypted_count": encrypted,
        "unencrypted_count": total - encrypted,
        "encryption_rate": round((encrypted / total * 100) if total > 0 else 0, 1),
        "twilio_enabled": TWILIO_ENABLED,
    }

# ============================================
# HEALTH CHECK
# ============================================

@api_router.get("/")
async def root():
    return {"message": "Last Chapter Vault API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    try:
        # Check MongoDB connection
        await db.command('ping')
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
