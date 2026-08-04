from pathlib import PurePosixPath
import httpx
from app.config import settings

class StorageClient:
    def __init__(self, client=None):
        self.client = client or httpx.AsyncClient(timeout=60)
        self.base = settings.SUPABASE_URL.rstrip("/")
        self.bucket = settings.SUPABASE_STORAGE_BUCKET
        self.headers = {"Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}", "apikey": settings.SUPABASE_SERVICE_ROLE_KEY}

    async def upload(self, path: str, data: bytes, content_type: str) -> str:
        url = f"{self.base}/storage/v1/object/{self.bucket}/{path}"
        response = await self.client.post(url, content=data, headers={**self.headers, "Content-Type": content_type, "x-upsert": "true"})
        response.raise_for_status()
        return path

    async def signed_url(self, path: str, expires: int = 300) -> str:
        url = f"{self.base}/storage/v1/object/sign/{self.bucket}/{path}"
        response = await self.client.post(url, json={"expiresIn": expires}, headers={**self.headers, "Content-Type": "application/json"})
        response.raise_for_status()
        signed = response.json().get("signedURL") or response.json().get("signedUrl")
        return f"{self.base}/storage/v1{signed}" if signed and signed.startswith("/") else signed

    async def delete(self, path: str) -> None:
        url = f"{self.base}/storage/v1/object/remove"
        response = await self.client.post(url, json={"prefixes": [f"{self.bucket}/{path}"]}, headers={**self.headers, "Content-Type": "application/json"})
        response.raise_for_status()

    async def download(self, path: str) -> bytes:
        url = f"{self.base}/storage/v1/object/{self.bucket}/{path}"
        response = await self.client.get(url, headers=self.headers)
        response.raise_for_status()
        return response.content

def safe_storage_path(material_id, filename: str) -> str:
    clean = PurePosixPath(filename).name
    return f"materials/{material_id}/{clean}"
