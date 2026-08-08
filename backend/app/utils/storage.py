from pathlib import PurePosixPath
import httpx
from app.config import settings

# Module-level shared client.  FastAPI shutdown hook (registered in main.py)
# calls close_shared_client() so the connection pool is released cleanly.
_shared_client: httpx.AsyncClient | None = None

def _get_shared_client() -> httpx.AsyncClient:
    global _shared_client
    if _shared_client is None or _shared_client.is_closed:
        _shared_client = httpx.AsyncClient(timeout=60)
    return _shared_client

async def close_shared_client() -> None:
    global _shared_client
    if _shared_client is not None and not _shared_client.is_closed:
        await _shared_client.aclose()
        _shared_client = None

class StorageClient:
    def __init__(self, client: httpx.AsyncClient | None = None):
        self.client = client or _get_shared_client()
        self.base = settings.SUPABASE_URL.rstrip("/")
        self.bucket = settings.SUPABASE_STORAGE_BUCKET
        self.headers = {"Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}", "apikey": settings.SUPABASE_SERVICE_ROLE_KEY}

    async def upload(self, path: str, data: bytes, content_type: str) -> str:
        url = f"{self.base}/storage/v1/object/{self.bucket}/{path}"
        response = await self.client.post(url, content=data, headers={**self.headers, "Content-Type": content_type, "x-upsert": "true"})
        response.raise_for_status()
        return path

    async def signed_url(self, path: str, expires: int = 300, *, download: bool = True) -> str:
        url = f"{self.base}/storage/v1/object/sign/{self.bucket}/{path}"
        body = {"expiresIn": expires}
        if download:
            body["download"] = "true"
        response = await self.client.post(url, json=body, headers={**self.headers, "Content-Type": "application/json"})
        response.raise_for_status()
        signed = response.json().get("signedURL") or response.json().get("signedUrl")
        return f"{self.base}/storage/v1{signed}" if signed and signed.startswith("/") else signed

    async def delete(self, path: str) -> None:
        """Delete an object from Supabase Storage.

        Uses DELETE /storage/v1/object/{bucket} with bucket-relative prefixes,
        which is the correct Supabase Storage API endpoint."""
        url = f"{self.base}/storage/v1/object/{self.bucket}"
        response = await self.client.request("DELETE", url, json={"prefixes": [path]}, headers={**self.headers, "Content-Type": "application/json"})
        response.raise_for_status()

    async def download(self, path: str) -> bytes:
        url = f"{self.base}/storage/v1/object/{self.bucket}/{path}"
        response = await self.client.get(url, headers=self.headers)
        response.raise_for_status()
        return response.content

def safe_storage_path(material_id, filename: str) -> str:
    clean = PurePosixPath(filename).name
    return f"materials/{material_id}/{clean}"
