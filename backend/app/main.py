from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.dependencies import get_current_user, UserInfo
from app.config import settings
from app.routers.skills import router as skills_router

app = FastAPI(title="Agent Platform API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(skills_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/me")
async def get_me(user: UserInfo = Depends(get_current_user)):
    return {
        "oid": user.oid,
        "name": user.name,
        "email": user.email,
        "tenant_id": user.tenant_id,
        "roles": user.roles,
    }
