from supabase import create_client, Client
from app.core.config import settings

# Initialize Supabase client
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)

# For admin operations (like user creation)
supabase_admin: Client = create_client(settings.supabase_url, settings.supabase_service_key)