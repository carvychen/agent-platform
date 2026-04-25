from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth.dependencies import UserInfo, require_admin, require_any_role
from app.mcps.models import McpCreateRequest, McpListResponse, McpResponse, McpUpdateRequest
from app.mcps.service import McpAlreadyExists, McpNotFound, McpService
from app.skills.service import BlobStorageService

router = APIRouter(prefix="/api/mcps", tags=["mcps"])


_blob_service: BlobStorageService | None = None
_mcp_service: McpService | None = None


def get_mcp_service() -> McpService:
    global _blob_service, _mcp_service
    if _mcp_service is None:
        if _blob_service is None:
            _blob_service = BlobStorageService()
        _mcp_service = McpService(store=_blob_service)
    return _mcp_service


@router.get("", response_model=McpListResponse)
def list_mcps(
    user: UserInfo = Depends(require_any_role),
    svc: McpService = Depends(get_mcp_service),
) -> McpListResponse:
    docs = svc.list(tenant_id=user.tenant_id)
    return McpListResponse(mcps=[McpResponse(**d) for d in docs])


@router.post("", response_model=McpResponse, status_code=status.HTTP_201_CREATED)
def create_mcp(
    req: McpCreateRequest,
    user: UserInfo = Depends(require_admin),
    svc: McpService = Depends(get_mcp_service),
) -> McpResponse:
    try:
        doc = svc.create(tenant_id=user.tenant_id, request_data=req.model_dump())
    except McpAlreadyExists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An MCP named '{req.name}' already exists in this tenant",
        )
    return McpResponse(**doc)


@router.get("/{name}", response_model=McpResponse)
def get_mcp(
    name: str,
    user: UserInfo = Depends(require_any_role),
    svc: McpService = Depends(get_mcp_service),
) -> McpResponse:
    try:
        doc = svc.get(tenant_id=user.tenant_id, name=name)
    except McpNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MCP '{name}' not found",
        )
    return McpResponse(**doc)


@router.put("/{name}", response_model=McpResponse)
def update_mcp(
    name: str,
    req: McpUpdateRequest,
    user: UserInfo = Depends(require_admin),
    svc: McpService = Depends(get_mcp_service),
) -> McpResponse:
    try:
        doc = svc.update(tenant_id=user.tenant_id, name=name, patch=req.model_dump())
    except McpNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MCP '{name}' not found",
        )
    return McpResponse(**doc)


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mcp(
    name: str,
    user: UserInfo = Depends(require_admin),
    svc: McpService = Depends(get_mcp_service),
) -> None:
    try:
        svc.delete(tenant_id=user.tenant_id, name=name)
    except McpNotFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"MCP '{name}' not found",
        )
