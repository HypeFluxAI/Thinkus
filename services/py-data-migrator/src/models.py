"""
数据迁移模型定义
"""

from enum import Enum
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class DataSourceType(str, Enum):
    """数据源类型"""
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"
    MYSQL = "mysql"
    POSTGRESQL = "postgresql"
    MONGODB = "mongodb"
    API = "api"


class MigrationStatus(str, Enum):
    """迁移状态"""
    PENDING = "pending"
    ANALYZING = "analyzing"
    MAPPING = "mapping"
    VALIDATING = "validating"
    MIGRATING = "migrating"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


class FieldType(str, Enum):
    """字段类型"""
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    DATE = "date"
    DATETIME = "datetime"
    EMAIL = "email"
    PHONE = "phone"
    URL = "url"
    JSON = "json"
    ARRAY = "array"
    UNKNOWN = "unknown"


class TransformType(str, Enum):
    """转换类型"""
    NONE = "none"
    TRIM = "trim"
    UPPERCASE = "uppercase"
    LOWERCASE = "lowercase"
    DATE_FORMAT = "date_format"
    NUMBER_FORMAT = "number_format"
    SPLIT = "split"
    CONCAT = "concat"
    LOOKUP = "lookup"
    CUSTOM = "custom"


class DataSourceConfig(BaseModel):
    """数据源配置"""
    type: DataSourceType
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    encoding: str = "utf-8"
    delimiter: str = ","
    sheet: Optional[str] = None

    # 数据库源
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    table: Optional[str] = None
    query: Optional[str] = None


class SourceField(BaseModel):
    """源字段"""
    name: str
    type: FieldType = FieldType.UNKNOWN
    nullable: bool = True
    sample_values: List[str] = []
    unique_count: int = 0
    null_count: int = 0


class TargetField(BaseModel):
    """目标字段"""
    name: str
    type: FieldType
    required: bool = False
    default_value: Optional[str] = None
    validation: Optional[str] = None  # 正则表达式


class FieldMapping(BaseModel):
    """字段映射"""
    source_field: str
    target_field: str
    transform: TransformType = TransformType.NONE
    transform_config: Dict[str, Any] = {}
    default_value: Optional[str] = None


class DataIssue(BaseModel):
    """数据问题"""
    field: str
    type: str  # missing, invalid, duplicate, format, encoding
    severity: str  # error, warning, info
    count: int
    description: str
    suggestion: str


class DataAnalysis(BaseModel):
    """数据分析结果"""
    total_rows: int
    total_columns: int
    fields: List[SourceField]
    sample_data: List[Dict[str, Any]] = []
    issues: List[DataIssue] = []
    suggested_mappings: List[FieldMapping] = []


class MigrationStats(BaseModel):
    """迁移统计"""
    total_records: int = 0
    processed_records: int = 0
    success_records: int = 0
    failed_records: int = 0
    skipped_records: int = 0


class MigrationError(BaseModel):
    """迁移错误"""
    row: int
    field: Optional[str] = None
    value: Optional[str] = None
    error: str
    timestamp: datetime = Field(default_factory=datetime.now)


class RollbackData(BaseModel):
    """回滚数据"""
    backup_collection: str
    can_rollback: bool = True


class MigrationTask(BaseModel):
    """迁移任务"""
    id: str
    project_id: str
    name: str
    description: str = ""

    # 配置
    source: Optional[DataSourceConfig] = None
    target_collection: str
    mappings: List[FieldMapping] = []

    # 状态
    status: MigrationStatus = MigrationStatus.PENDING
    progress: int = 0  # 0-100
    current_step: str = "等待开始"

    # 统计
    stats: MigrationStats = Field(default_factory=MigrationStats)

    # 时间
    created_at: datetime = Field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # 错误
    errors: List[MigrationError] = []

    # 回滚
    rollback_data: Optional[RollbackData] = None


# 目标表配置
TARGET_COLLECTIONS: Dict[str, List[TargetField]] = {
    "users": [
        TargetField(name="name", type=FieldType.STRING, required=True),
        TargetField(name="email", type=FieldType.EMAIL, required=True),
        TargetField(name="phone", type=FieldType.PHONE, required=False),
        TargetField(name="created_at", type=FieldType.DATETIME, required=False),
    ],
    "products": [
        TargetField(name="name", type=FieldType.STRING, required=True),
        TargetField(name="description", type=FieldType.STRING, required=False),
        TargetField(name="price", type=FieldType.NUMBER, required=True),
        TargetField(name="stock", type=FieldType.NUMBER, required=False),
        TargetField(name="category", type=FieldType.STRING, required=False),
        TargetField(name="image_url", type=FieldType.URL, required=False),
    ],
    "orders": [
        TargetField(name="order_number", type=FieldType.STRING, required=True),
        TargetField(name="customer_id", type=FieldType.STRING, required=True),
        TargetField(name="total_amount", type=FieldType.NUMBER, required=True),
        TargetField(name="status", type=FieldType.STRING, required=True),
        TargetField(name="created_at", type=FieldType.DATETIME, required=True),
    ],
    "customers": [
        TargetField(name="name", type=FieldType.STRING, required=True),
        TargetField(name="email", type=FieldType.EMAIL, required=True),
        TargetField(name="phone", type=FieldType.PHONE, required=False),
        TargetField(name="address", type=FieldType.STRING, required=False),
        TargetField(name="created_at", type=FieldType.DATETIME, required=False),
    ],
}

# 字段名别名映射
FIELD_NAME_ALIASES: Dict[str, List[str]] = {
    "name": ["名称", "姓名", "name", "title", "名字", "fullname", "full_name"],
    "email": ["邮箱", "邮件", "email", "mail", "e-mail", "电子邮箱"],
    "phone": ["电话", "手机", "phone", "mobile", "tel", "联系电话", "telephone"],
    "price": ["价格", "单价", "price", "amount", "金额", "cost"],
    "stock": ["库存", "数量", "stock", "quantity", "qty", "存量"],
    "created_at": ["创建时间", "添加时间", "created_at", "create_time", "createTime"],
    "address": ["地址", "address", "收货地址", "详细地址"],
    "status": ["状态", "status", "state"],
    "category": ["分类", "类别", "category", "type", "产品分类"],
    "description": ["描述", "说明", "description", "desc", "详情", "简介"],
}
