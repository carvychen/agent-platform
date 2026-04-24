"""Factory for the Coming Soon 501 stub contract.

Slice 2 (#4) ships MCP, Prompt, and Agent hubs as 501 stubs while their real
CRUD implementations are deferred to later slices. Each hub's router.py is a
two-line factory call; when a hub gets a real implementation its router.py
is replaced wholesale (and eventually this module deleted).
"""
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

_TRACKING_URL = "https://github.com/carvychen/agent-platform/issues/1"


def coming_soon_router(module: str, display_name: str) -> APIRouter:
    router = APIRouter(prefix=f"/api/{module}", tags=[module])
    detail = (
        f"{display_name} Hub is not yet implemented. This endpoint exists "
        f"so the frontend and integrations can depend on a stable contract."
    )

    @router.get("")
    def list_stub() -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            content={
                "status_code": status.HTTP_501_NOT_IMPLEMENTED,
                "module": module,
                "detail": detail,
                "tracking": _TRACKING_URL,
            },
        )

    return router
