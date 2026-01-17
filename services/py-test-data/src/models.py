"""
测试数据模型定义
"""

from enum import Enum
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class DataType(str, Enum):
    """数据类型"""
    USER = "user"
    PRODUCT = "product"
    ORDER = "order"
    CUSTOMER = "customer"
    ARTICLE = "article"
    COMMENT = "comment"
    CATEGORY = "category"
    ADDRESS = "address"
    COMPANY = "company"
    TRANSACTION = "transaction"


class ProductType(str, Enum):
    """产品类型"""
    ECOMMERCE = "ecommerce"
    CMS = "cms"
    CRM = "crm"
    SAAS = "saas"
    SOCIAL = "social"
    EDUCATION = "education"
    HEALTHCARE = "healthcare"
    FINANCE = "finance"
    CUSTOM = "custom"


class DataQuality(str, Enum):
    """数据质量"""
    REALISTIC = "realistic"  # 真实感强
    SIMPLE = "simple"  # 简单数据
    EDGE_CASE = "edge_case"  # 边界情况


class GenerationConfig(BaseModel):
    """生成配置"""
    data_type: DataType
    count: int = 10
    quality: DataQuality = DataQuality.REALISTIC
    locale: str = "zh_CN"  # 默认中文
    include_relations: bool = True  # 是否包含关联数据
    custom_fields: Optional[Dict[str, str]] = None  # 自定义字段


class DataTemplate(BaseModel):
    """数据模板"""
    name: str
    data_type: DataType
    fields: List[Dict[str, Any]]
    sample_count: int = 10
    description: str = ""


class GenerationTask(BaseModel):
    """生成任务"""
    id: str
    project_id: str
    name: str
    description: str = ""

    # 配置
    product_type: ProductType
    configs: List[GenerationConfig]

    # 状态
    status: str = "pending"  # pending/generating/completed/failed
    progress: int = 0

    # 结果
    generated_count: int = 0
    output_format: str = "json"  # json/csv/sql/mongodb
    output_path: Optional[str] = None

    # 时间
    created_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None


class GeneratedData(BaseModel):
    """生成的数据"""
    data_type: DataType
    records: List[Dict[str, Any]]
    count: int
    metadata: Dict[str, Any] = {}


class GenerationResult(BaseModel):
    """生成结果"""
    task_id: str
    success: bool
    data: List[GeneratedData]
    total_records: int
    duration_ms: int
    output_files: List[str] = []
    errors: List[str] = []


# 产品类型对应的数据需求
PRODUCT_TYPE_DATA_NEEDS: Dict[ProductType, List[DataType]] = {
    ProductType.ECOMMERCE: [
        DataType.USER,
        DataType.PRODUCT,
        DataType.CATEGORY,
        DataType.ORDER,
        DataType.CUSTOMER,
        DataType.ADDRESS,
    ],
    ProductType.CMS: [
        DataType.USER,
        DataType.ARTICLE,
        DataType.CATEGORY,
        DataType.COMMENT,
    ],
    ProductType.CRM: [
        DataType.USER,
        DataType.CUSTOMER,
        DataType.COMPANY,
        DataType.TRANSACTION,
    ],
    ProductType.SAAS: [
        DataType.USER,
        DataType.COMPANY,
        DataType.TRANSACTION,
    ],
    ProductType.SOCIAL: [
        DataType.USER,
        DataType.ARTICLE,
        DataType.COMMENT,
    ],
    ProductType.EDUCATION: [
        DataType.USER,
        DataType.CATEGORY,
        DataType.ARTICLE,
        DataType.COMMENT,
    ],
    ProductType.HEALTHCARE: [
        DataType.USER,
        DataType.CUSTOMER,
        DataType.ADDRESS,
    ],
    ProductType.FINANCE: [
        DataType.USER,
        DataType.CUSTOMER,
        DataType.TRANSACTION,
        DataType.COMPANY,
    ],
    ProductType.CUSTOM: [
        DataType.USER,
    ],
}


# 数据类型的默认数量
DEFAULT_COUNTS: Dict[DataType, int] = {
    DataType.USER: 50,
    DataType.PRODUCT: 100,
    DataType.ORDER: 200,
    DataType.CUSTOMER: 80,
    DataType.ARTICLE: 30,
    DataType.COMMENT: 150,
    DataType.CATEGORY: 20,
    DataType.ADDRESS: 80,
    DataType.COMPANY: 30,
    DataType.TRANSACTION: 300,
}
