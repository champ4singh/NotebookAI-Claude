from fastapi import APIRouter, HTTPException, status
from app.models.schemas import UserCreate, UserLogin, UserResponse, User
from app.models.database import supabase, supabase_admin
from app.core.security import verify_password, get_password_hash, create_access_token
import uuid
from datetime import datetime

router = APIRouter()

@router.get("/test-db")
async def test_database():
    """Test database connection and table existence"""
    try:
        # Test connection by trying to select from users table
        result = supabase_admin.table("users").select("id").limit(1).execute()
        return {
            "status": "success",
            "message": "Database connection successful",
            "tables_accessible": True,
            "result": result.data if hasattr(result, 'data') else None,
            "error": result.error if hasattr(result, 'error') else None
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Database connection failed: {str(e)}",
            "tables_accessible": False,
            "error": str(e)
        }

@router.post("/signup", response_model=UserResponse)
async def signup(user: UserCreate):
    try:
        print(f"Signup attempt for email: {user.email}")
        
        # Check if user already exists
        existing_user = supabase_admin.table("users").select("*").eq("email", user.email).execute()
        print(f"Existing user check: {existing_user}")
        
        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password and create user
        hashed_password = get_password_hash(user.password)
        user_id = str(uuid.uuid4())
        
        new_user = {
            "id": user_id,
            "email": user.email,
            "name": user.name,
            "password_hash": hashed_password,
            "created_at": datetime.utcnow().isoformat()
        }
        
        print(f"Creating user with data: {new_user}")
        result = supabase_admin.table("users").insert(new_user).execute()
        print(f"Insert result: {result}")
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user. Error: {getattr(result, 'error', 'Unknown error')}"
            )
        
        # Create access token
        access_token = create_access_token(data={"sub": user_id})
        
        user_data = User(
            id=user_id,
            email=user.email,
            name=user.name,
            created_at=datetime.fromisoformat(result.data[0]["created_at"])
        )
        
        return UserResponse(
            user=user_data,
            access_token=access_token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signup error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/login", response_model=UserResponse)
async def login(user_credentials: UserLogin):
    try:
        print(f"Login attempt for email: {user_credentials.email}")
        
        # Get user from database
        result = supabase_admin.table("users").select("*").eq("email", user_credentials.email).execute()
        print(f"User lookup result: {result}")
        
        if not result.data:
            print("User not found in database")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        user_data = result.data[0]
        print(f"Found user: {user_data['email']}")
        
        # Verify password
        password_valid = verify_password(user_credentials.password, user_data["password_hash"])
        print(f"Password verification result: {password_valid}")
        
        if not password_valid:
            print("Password verification failed")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Create access token
        access_token = create_access_token(data={"sub": user_data["id"]})
        print(f"Access token created successfully")
        
        user = User(
            id=user_data["id"],
            email=user_data["email"],
            name=user_data["name"],
            created_at=datetime.fromisoformat(user_data["created_at"])
        )
        
        return UserResponse(
            user=user,
            access_token=access_token
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )