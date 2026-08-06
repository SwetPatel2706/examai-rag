from typing import Dict, Any, Optional
# pyrefly: ignore [missing-import]
import httpx
from app.config import settings

class SupabaseAuthClient:
    def __init__(self):
        # Ensure we construct valid urls with /auth/v1
        base_url = settings.SUPABASE_URL
        if not base_url.startswith("http://") and not base_url.startswith("https://"):
            base_url = f"https://{base_url}.supabase.co"
        self.auth_url = f"{base_url}/auth/v1"
        self.anon_key = settings.SUPABASE_ANON_KEY
        self.service_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.client = httpx.AsyncClient()

    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user with email and password."""
        url = f"{self.auth_url}/token?grant_type=password"
        headers = {
            "apikey": self.anon_key,
            "Content-Type": "application/json"
        }
        data = {
            "email": email,
            "password": password
        }
        response = await self.client.post(url, headers=headers, json=data)
        if response.status_code != 200:
            try:
                error_detail = response.json().get("error_description", "Invalid login credentials")
            except Exception:
                error_detail = "Invalid login credentials"
            raise ValueError(error_detail)
        return response.json()

    async def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify token and get user info."""
        url = f"{self.auth_url}/user"
        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {token}"
        }
        response = await self.client.get(url, headers=headers)
        if response.status_code != 200:
            raise ValueError("Invalid or expired session token")
        return response.json()

    async def admin_create_user(self, email: str, password: str) -> Dict[str, Any]:
        """Create a user with the service role key (for seeding)."""
        url = f"{self.auth_url}/admin/users"
        headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json"
        }
        data = {
            "email": email,
            "password": password,
            "email_confirm": True
        }
        response = await self.client.post(url, headers=headers, json=data)
        if response.status_code not in (200, 201):
            # Check if user already exists
            try:
                error_info = response.json()
            except Exception:
                error_info = {}
            msg = error_info.get("msg") or error_info.get("error", "Failed to create user")
            if isinstance(msg, str) and ("already registered" in msg.lower() or "already exists" in msg.lower()):
                # Attempt to look up the user by email
                user = await self._admin_get_user_by_email(email)
                if user:
                    return user
            raise ValueError(msg)
        return response.json()

    async def _admin_get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """List users with pagination to find one by email (admin helper)."""
        headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}"
        }
        page = 1
        per_page = 50
        while True:
            url = f"{self.auth_url}/admin/users?page={page}&per_page={per_page}"
            response = await self.client.get(url, headers=headers)
            if response.status_code != 200:
                break
            try:
                users_list = response.json()
            except Exception:
                break

            batch = []
            if isinstance(users_list, list):
                batch = users_list
            elif isinstance(users_list, dict) and "users" in users_list:
                batch = users_list["users"]

            if not batch:
                break

            for u in batch:
                if u.get("email") == email:
                    return u

            if len(batch) < per_page:
                break
            page += 1

        return None


    async def logout(self, token: str) -> None:
        url = f"{self.auth_url}/logout"
        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {token}"
        }
        await self.client.post(url, headers=headers)

supabase_auth = SupabaseAuthClient()
