"""
数据迁移服务 - Python 实现

功能：
- 多格式数据导入 (Excel/CSV/JSON)
- Pandas 数据处理和清洗
- 智能字段映射
- 批量数据迁移
"""

import os
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

from .migrator import DataMigrator
from .models import (
    MigrationTask,
    MigrationStatus,
    DataSourceConfig,
    FieldMapping,
    DataAnalysis,
)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 创建 FastAPI 应用
app = FastAPI(
    title="Thinkus Data Migrator",
    description="数据迁移服务 - 支持多格式数据导入和智能映射",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 创建迁移器实例
migrator = DataMigrator()


# ========== 请求/响应模型 ==========

class CreateTaskRequest(BaseModel):
    project_id: str
    name: str
    description: Optional[str] = ""
    target_collection: str


class AnalyzeRequest(BaseModel):
    source_type: str  # excel, csv, json
    encoding: Optional[str] = "utf-8"
    delimiter: Optional[str] = ","
    sheet: Optional[str] = None


class SetMappingsRequest(BaseModel):
    mappings: List[FieldMapping]


class ExecuteRequest(BaseModel):
    batch_size: Optional[int] = 100


# ========== API 路由 ==========

@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "service": "py-data-migrator"}


@app.post("/api/v1/tasks")
async def create_task(request: CreateTaskRequest):
    """创建迁移任务"""
    task = migrator.create_task(
        project_id=request.project_id,
        name=request.name,
        description=request.description,
        target_collection=request.target_collection
    )
    return task


@app.get("/api/v1/tasks/{task_id}")
async def get_task(task_id: str):
    """获取任务详情"""
    task = migrator.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@app.get("/api/v1/tasks")
async def list_tasks(project_id: Optional[str] = None):
    """获取任务列表"""
    tasks = migrator.list_tasks(project_id)
    return {"tasks": tasks}


@app.post("/api/v1/tasks/{task_id}/upload")
async def upload_file(task_id: str, file: UploadFile = File(...)):
    """上传数据文件"""
    task = migrator.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 保存文件
    content = await file.read()
    file_path = migrator.save_uploaded_file(task_id, file.filename, content)

    # 更新任务
    migrator.update_task(task_id, {
        "source": {
            "type": _detect_file_type(file.filename),
            "file_path": file_path,
            "file_name": file.filename,
        }
    })

    return {"success": True, "file_path": file_path}


@app.post("/api/v1/tasks/{task_id}/analyze")
async def analyze_source(task_id: str, request: AnalyzeRequest):
    """分析数据源"""
    task = migrator.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    analysis = await migrator.analyze_source(
        task_id=task_id,
        encoding=request.encoding,
        delimiter=request.delimiter,
        sheet=request.sheet
    )

    return analysis


@app.post("/api/v1/tasks/{task_id}/mappings")
async def set_mappings(task_id: str, request: SetMappingsRequest):
    """设置字段映射"""
    task = migrator.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    success = migrator.set_mappings(task_id, request.mappings)
    if not success:
        raise HTTPException(status_code=400, detail="设置映射失败")

    return {"success": True}


@app.post("/api/v1/tasks/{task_id}/validate")
async def validate_mappings(task_id: str):
    """验证映射配置"""
    task = migrator.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    issues = migrator.validate_mappings(task_id)
    return {"issues": issues, "valid": len([i for i in issues if i["severity"] == "error"]) == 0}


@app.post("/api/v1/tasks/{task_id}/execute")
async def execute_migration(task_id: str, request: ExecuteRequest):
    """执行迁移"""
    task = migrator.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    result = await migrator.execute_migration(
        task_id=task_id,
        batch_size=request.batch_size
    )

    return result


@app.post("/api/v1/tasks/{task_id}/rollback")
async def rollback_migration(task_id: str):
    """回滚迁移"""
    task = migrator.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    success = await migrator.rollback(task_id)
    return {"success": success}


@app.get("/api/v1/tasks/{task_id}/report")
async def get_report(task_id: str):
    """获取迁移报告"""
    task = migrator.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    report = migrator.generate_report(task_id)
    return {"report": report}


@app.get("/api/v1/collections")
async def get_supported_collections():
    """获取支持的目标表"""
    return {"collections": migrator.get_supported_collections()}


@app.get("/api/v1/collections/{name}/fields")
async def get_collection_fields(name: str):
    """获取目标表字段"""
    fields = migrator.get_target_fields(name)
    return {"fields": fields}


# ========== 辅助函数 ==========

def _detect_file_type(filename: str) -> str:
    """检测文件类型"""
    ext = filename.lower().split('.')[-1]
    type_map = {
        'xlsx': 'excel',
        'xls': 'excel',
        'csv': 'csv',
        'json': 'json',
    }
    return type_map.get(ext, 'unknown')


# ========== 启动 ==========

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "9002"))
    uvicorn.run(app, host="0.0.0.0", port=port)
