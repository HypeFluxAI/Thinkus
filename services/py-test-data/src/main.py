"""
Thinkus Test Data Generator Service
FastAPI 入口
"""

import os
import uuid
import time
from typing import Optional, List
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .models import (
    DataType,
    ProductType,
    DataQuality,
    GenerationConfig,
    GenerationTask,
    GeneratedData,
    GenerationResult,
    PRODUCT_TYPE_DATA_NEEDS,
    DEFAULT_COUNTS,
)
from .generator import TestDataGenerator

# 创建 FastAPI 应用
app = FastAPI(
    title="Thinkus Test Data Generator",
    description="中文友好的测试数据生成服务",
    version="1.0.0",
)

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局生成器实例
generator = TestDataGenerator()

# 任务存储（生产环境应使用 Redis/MongoDB）
tasks: dict[str, GenerationTask] = {}
results: dict[str, GenerationResult] = {}


# ========== 请求模型 ==========

class GenerateByProductTypeRequest(BaseModel):
    """按产品类型生成请求"""
    project_id: str
    product_type: ProductType
    scale: str = "small"  # small/medium/large
    quality: DataQuality = DataQuality.REALISTIC


class GenerateCustomRequest(BaseModel):
    """自定义生成请求"""
    project_id: str
    configs: List[GenerationConfig]
    name: str = "自定义数据集"
    description: str = ""


class GenerateSingleRequest(BaseModel):
    """单类型生成请求"""
    data_type: DataType
    count: int = 10
    quality: DataQuality = DataQuality.REALISTIC
    locale: str = "zh_CN"


# ========== API 路由 ==========

@app.get("/health")
async def health():
    """健康检查"""
    return {
        "status": "healthy",
        "service": "py-test-data",
        "version": "1.0.0",
    }


@app.get("/api/v1/data-types")
async def list_data_types():
    """获取支持的数据类型列表"""
    return {
        "success": True,
        "data_types": [
            {
                "type": dt.value,
                "label": get_data_type_label(dt),
                "default_count": DEFAULT_COUNTS.get(dt, 10),
            }
            for dt in DataType
        ],
    }


@app.get("/api/v1/product-types")
async def list_product_types():
    """获取产品类型及其数据需求"""
    return {
        "success": True,
        "product_types": [
            {
                "type": pt.value,
                "label": get_product_type_label(pt),
                "data_needs": [dt.value for dt in PRODUCT_TYPE_DATA_NEEDS.get(pt, [])],
            }
            for pt in ProductType
        ],
    }


@app.post("/api/v1/generate/by-product-type")
async def generate_by_product_type(
    request: GenerateByProductTypeRequest,
    background_tasks: BackgroundTasks,
):
    """根据产品类型生成完整测试数据集"""
    task_id = str(uuid.uuid4())

    # 创建任务
    task = GenerationTask(
        id=task_id,
        project_id=request.project_id,
        name=f"{get_product_type_label(request.product_type)}测试数据",
        product_type=request.product_type,
        configs=[],
        status="generating",
    )
    tasks[task_id] = task

    # 同步执行生成（小规模数据）
    try:
        result = generator.generate_for_product_type(
            project_id=request.project_id,
            product_type=request.product_type,
            scale=request.scale,
            quality=request.quality,
        )

        task.status = "completed"
        task.completed_at = datetime.now()
        task.generated_count = result.total_records
        results[task_id] = result

        return {
            "success": True,
            "task_id": task_id,
            "status": "completed",
            "total_records": result.total_records,
            "duration_ms": result.duration_ms,
            "data": {
                gen.data_type.value: gen.records
                for gen in result.data
            },
            "summary": {
                gen.data_type.value: gen.count
                for gen in result.data
            },
        }

    except Exception as e:
        task.status = "failed"
        return {
            "success": False,
            "task_id": task_id,
            "error": str(e),
        }


@app.post("/api/v1/generate/single")
async def generate_single(request: GenerateSingleRequest):
    """生成单一类型的数据"""
    start_time = time.time()

    config = GenerationConfig(
        data_type=request.data_type,
        count=request.count,
        quality=request.quality,
        locale=request.locale,
    )

    generated = generator.generate_data(config)

    duration_ms = int((time.time() - start_time) * 1000)

    return {
        "success": True,
        "data_type": generated.data_type.value,
        "count": generated.count,
        "duration_ms": duration_ms,
        "records": generated.records,
        "metadata": generated.metadata,
    }


@app.post("/api/v1/generate/custom")
async def generate_custom(request: GenerateCustomRequest):
    """自定义生成多种数据"""
    task_id = str(uuid.uuid4())
    start_time = time.time()

    all_data: List[GeneratedData] = []
    total_records = 0

    # 重置生成器缓存
    generator._user_ids = []
    generator._product_ids = []
    generator._category_ids = []
    generator._customer_ids = []
    generator._company_ids = []

    for config in request.configs:
        generated = generator.generate_data(config)
        all_data.append(generated)
        total_records += generated.count

    duration_ms = int((time.time() - start_time) * 1000)

    result = GenerationResult(
        task_id=task_id,
        success=True,
        data=all_data,
        total_records=total_records,
        duration_ms=duration_ms,
    )

    results[task_id] = result

    return {
        "success": True,
        "task_id": task_id,
        "total_records": total_records,
        "duration_ms": duration_ms,
        "data": {
            gen.data_type.value: gen.records
            for gen in all_data
        },
        "summary": {
            gen.data_type.value: gen.count
            for gen in all_data
        },
    }


@app.get("/api/v1/tasks/{task_id}")
async def get_task(task_id: str):
    """获取任务状态"""
    task = tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    return {
        "success": True,
        "task": task.model_dump(),
    }


@app.get("/api/v1/tasks/{task_id}/result")
async def get_task_result(task_id: str):
    """获取任务结果"""
    result = results.get(task_id)
    if not result:
        raise HTTPException(status_code=404, detail="结果不存在")

    return {
        "success": True,
        "task_id": task_id,
        "total_records": result.total_records,
        "duration_ms": result.duration_ms,
        "data": {
            gen.data_type.value: gen.records
            for gen in result.data
        },
    }


@app.get("/api/v1/preview/{data_type}")
async def preview_data(
    data_type: DataType,
    count: int = 5,
    quality: DataQuality = DataQuality.REALISTIC,
):
    """预览数据样例"""
    config = GenerationConfig(
        data_type=data_type,
        count=count,
        quality=quality,
    )

    generated = generator.generate_data(config)

    return {
        "success": True,
        "data_type": data_type.value,
        "label": get_data_type_label(data_type),
        "count": generated.count,
        "sample": generated.records,
        "fields": list(generated.records[0].keys()) if generated.records else [],
    }


# ========== 辅助函数 ==========

def get_data_type_label(dt: DataType) -> str:
    """获取数据类型的中文标签"""
    labels = {
        DataType.USER: "用户",
        DataType.PRODUCT: "产品",
        DataType.ORDER: "订单",
        DataType.CUSTOMER: "客户",
        DataType.ARTICLE: "文章",
        DataType.COMMENT: "评论",
        DataType.CATEGORY: "分类",
        DataType.ADDRESS: "地址",
        DataType.COMPANY: "公司",
        DataType.TRANSACTION: "交易",
    }
    return labels.get(dt, dt.value)


def get_product_type_label(pt: ProductType) -> str:
    """获取产品类型的中文标签"""
    labels = {
        ProductType.ECOMMERCE: "电商平台",
        ProductType.CMS: "内容管理",
        ProductType.CRM: "客户管理",
        ProductType.SAAS: "SaaS应用",
        ProductType.SOCIAL: "社交平台",
        ProductType.EDUCATION: "教育平台",
        ProductType.HEALTHCARE: "医疗健康",
        ProductType.FINANCE: "金融服务",
        ProductType.CUSTOM: "自定义",
    }
    return labels.get(pt, pt.value)


# ========== 启动入口 ==========

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "9003"))
    uvicorn.run(app, host="0.0.0.0", port=port)
