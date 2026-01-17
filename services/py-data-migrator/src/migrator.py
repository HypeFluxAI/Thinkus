"""
数据迁移器核心实现
使用 Pandas 进行高效数据处理
"""

import os
import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

import pandas as pd
import chardet

from .models import (
    MigrationTask,
    MigrationStatus,
    DataSourceConfig,
    DataSourceType,
    SourceField,
    TargetField,
    FieldMapping,
    FieldType,
    TransformType,
    DataAnalysis,
    DataIssue,
    MigrationStats,
    MigrationError,
    RollbackData,
    TARGET_COLLECTIONS,
    FIELD_NAME_ALIASES,
)

logger = logging.getLogger(__name__)


class DataMigrator:
    """数据迁移器"""

    def __init__(self):
        self.tasks: Dict[str, MigrationTask] = {}
        self.upload_dir = "/tmp/migrations"
        os.makedirs(self.upload_dir, exist_ok=True)

    def create_task(
        self,
        project_id: str,
        name: str,
        description: str,
        target_collection: str
    ) -> MigrationTask:
        """创建迁移任务"""
        task_id = f"mig_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:9]}"

        task = MigrationTask(
            id=task_id,
            project_id=project_id,
            name=name,
            description=description,
            target_collection=target_collection,
        )

        self.tasks[task_id] = task
        logger.info(f"Created migration task: {task_id}")
        return task

    def get_task(self, task_id: str) -> Optional[MigrationTask]:
        """获取任务"""
        return self.tasks.get(task_id)

    def list_tasks(self, project_id: Optional[str] = None) -> List[MigrationTask]:
        """获取任务列表"""
        tasks = list(self.tasks.values())
        if project_id:
            tasks = [t for t in tasks if t.project_id == project_id]
        return sorted(tasks, key=lambda t: t.created_at, reverse=True)

    def update_task(self, task_id: str, updates: Dict[str, Any]) -> bool:
        """更新任务"""
        task = self.tasks.get(task_id)
        if not task:
            return False

        for key, value in updates.items():
            if hasattr(task, key):
                if key == "source" and isinstance(value, dict):
                    task.source = DataSourceConfig(**value)
                else:
                    setattr(task, key, value)

        return True

    def save_uploaded_file(self, task_id: str, filename: str, content: bytes) -> str:
        """保存上传的文件"""
        task_dir = os.path.join(self.upload_dir, task_id)
        os.makedirs(task_dir, exist_ok=True)

        file_path = os.path.join(task_dir, filename)
        with open(file_path, "wb") as f:
            f.write(content)

        logger.info(f"Saved file: {file_path}")
        return file_path

    async def analyze_source(
        self,
        task_id: str,
        encoding: str = "utf-8",
        delimiter: str = ",",
        sheet: Optional[str] = None
    ) -> DataAnalysis:
        """分析数据源"""
        task = self.tasks.get(task_id)
        if not task or not task.source:
            raise ValueError("任务或数据源不存在")

        self.update_task(task_id, {
            "status": MigrationStatus.ANALYZING,
            "current_step": "分析数据源...",
        })

        # 读取数据
        df = self._read_data(task.source, encoding, delimiter, sheet)

        # 分析字段
        fields = self._analyze_fields(df)

        # 检测问题
        issues = self._detect_issues(df, fields)

        # 生成建议映射
        target_fields = TARGET_COLLECTIONS.get(task.target_collection, [])
        suggested_mappings = self._generate_suggested_mappings(fields, target_fields)

        # 更新任务
        self.update_task(task_id, {
            "status": MigrationStatus.MAPPING,
            "current_step": "等待字段映射",
            "stats": MigrationStats(total_records=len(df)),
        })

        analysis = DataAnalysis(
            total_rows=len(df),
            total_columns=len(df.columns),
            fields=fields,
            sample_data=df.head(5).to_dict(orient="records"),
            issues=issues,
            suggested_mappings=suggested_mappings,
        )

        return analysis

    def _read_data(
        self,
        source: DataSourceConfig,
        encoding: str,
        delimiter: str,
        sheet: Optional[str]
    ) -> pd.DataFrame:
        """读取数据文件"""
        file_path = source.file_path
        source_type = source.type

        if source_type == DataSourceType.EXCEL:
            df = pd.read_excel(file_path, sheet_name=sheet or 0)
        elif source_type == DataSourceType.CSV:
            # 自动检测编码
            if encoding == "auto":
                with open(file_path, "rb") as f:
                    result = chardet.detect(f.read(10000))
                    encoding = result.get("encoding", "utf-8")
            df = pd.read_csv(file_path, encoding=encoding, delimiter=delimiter)
        elif source_type == DataSourceType.JSON:
            df = pd.read_json(file_path)
        else:
            raise ValueError(f"不支持的数据源类型: {source_type}")

        logger.info(f"Read {len(df)} rows from {file_path}")
        return df

    def _analyze_fields(self, df: pd.DataFrame) -> List[SourceField]:
        """分析字段"""
        fields = []

        for col in df.columns:
            series = df[col]

            # 检测类型
            field_type = self._detect_field_type(series)

            # 获取示例值
            sample_values = series.dropna().head(5).astype(str).tolist()

            field = SourceField(
                name=col,
                type=field_type,
                nullable=series.isna().any(),
                sample_values=sample_values,
                unique_count=series.nunique(),
                null_count=int(series.isna().sum()),
            )
            fields.append(field)

        return fields

    def _detect_field_type(self, series: pd.Series) -> FieldType:
        """检测字段类型"""
        # 尝试不同类型
        if pd.api.types.is_numeric_dtype(series):
            return FieldType.NUMBER
        if pd.api.types.is_bool_dtype(series):
            return FieldType.BOOLEAN
        if pd.api.types.is_datetime64_any_dtype(series):
            return FieldType.DATETIME

        # 检查字符串内容
        sample = series.dropna().head(100).astype(str)
        if len(sample) == 0:
            return FieldType.UNKNOWN

        # 检查是否是邮箱
        email_pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if sample.str.match(email_pattern).mean() > 0.8:
            return FieldType.EMAIL

        # 检查是否是电话
        phone_pattern = r'^1[3-9]\d{9}$'
        if sample.str.match(phone_pattern).mean() > 0.5:
            return FieldType.PHONE

        # 检查是否是URL
        url_pattern = r'^https?://'
        if sample.str.match(url_pattern).mean() > 0.5:
            return FieldType.URL

        # 检查是否是日期
        try:
            pd.to_datetime(sample.head(10))
            return FieldType.DATE
        except:
            pass

        return FieldType.STRING

    def _detect_issues(self, df: pd.DataFrame, fields: List[SourceField]) -> List[DataIssue]:
        """检测数据问题"""
        issues = []

        for field in fields:
            # 检查空值
            if field.null_count > 0:
                issues.append(DataIssue(
                    field=field.name,
                    type="missing",
                    severity="warning",
                    count=field.null_count,
                    description=f"{field.null_count} 条记录缺少 {field.name}",
                    suggestion="可以使用默认值或跳过这些记录",
                ))

            # 检查重复
            if field.unique_count < len(df) * 0.5 and field.type == FieldType.STRING:
                issues.append(DataIssue(
                    field=field.name,
                    type="duplicate",
                    severity="info",
                    count=len(df) - field.unique_count,
                    description=f"{field.name} 字段有较多重复值",
                    suggestion="确认这是否符合预期",
                ))

        return issues

    def _generate_suggested_mappings(
        self,
        source_fields: List[SourceField],
        target_fields: List[TargetField]
    ) -> List[FieldMapping]:
        """生成建议映射"""
        mappings = []

        for target in target_fields:
            aliases = FIELD_NAME_ALIASES.get(target.name, [target.name])

            # 查找匹配的源字段
            matched = None
            for source in source_fields:
                source_lower = source.name.lower()
                for alias in aliases:
                    alias_lower = alias.lower()
                    if (source_lower == alias_lower or
                        source_lower in alias_lower or
                        alias_lower in source_lower):
                        matched = source
                        break
                if matched:
                    break

            if matched:
                mappings.append(FieldMapping(
                    source_field=matched.name,
                    target_field=target.name,
                    transform=TransformType.NONE,
                ))

        return mappings

    def set_mappings(self, task_id: str, mappings: List[FieldMapping]) -> bool:
        """设置字段映射"""
        task = self.tasks.get(task_id)
        if not task:
            return False

        task.mappings = mappings
        task.status = MigrationStatus.VALIDATING
        task.current_step = "验证映射配置"

        return True

    def validate_mappings(self, task_id: str) -> List[Dict[str, Any]]:
        """验证映射配置"""
        task = self.tasks.get(task_id)
        if not task:
            return []

        issues = []
        target_fields = TARGET_COLLECTIONS.get(task.target_collection, [])

        # 检查必填字段
        for target in target_fields:
            if target.required:
                mapped = next((m for m in task.mappings if m.target_field == target.name), None)
                if not mapped:
                    issues.append({
                        "field": target.name,
                        "type": "missing",
                        "severity": "error",
                        "description": f"必填字段 '{target.name}' 未映射",
                        "suggestion": "请选择一个源字段映射到此字段，或设置默认值",
                    })

        return issues

    async def execute_migration(
        self,
        task_id: str,
        batch_size: int = 100
    ) -> MigrationTask:
        """执行迁移"""
        task = self.tasks.get(task_id)
        if not task or not task.source:
            raise ValueError("任务或数据源不存在")

        # 验证映射
        issues = self.validate_mappings(task_id)
        has_errors = any(i["severity"] == "error" for i in issues)
        if has_errors:
            raise ValueError("映射验证失败，请先修复错误")

        self.update_task(task_id, {
            "status": MigrationStatus.MIGRATING,
            "started_at": datetime.now(),
            "current_step": "开始迁移...",
        })

        try:
            # 读取数据
            df = self._read_data(
                task.source,
                task.source.encoding,
                task.source.delimiter,
                task.source.sheet
            )

            # 应用转换
            result_df = self._apply_transformations(df, task.mappings)

            # 模拟批量插入
            total = len(result_df)
            success = 0
            failed = 0
            skipped = 0

            for i in range(0, total, batch_size):
                batch = result_df.iloc[i:i + batch_size]

                for idx, row in batch.iterrows():
                    try:
                        # 这里应该实际插入数据库
                        # 目前模拟处理
                        if pd.isna(row).any():
                            skipped += 1
                        else:
                            success += 1
                    except Exception as e:
                        failed += 1
                        task.errors.append(MigrationError(
                            row=idx,
                            error=str(e),
                        ))

                # 更新进度
                progress = min(100, int((i + len(batch)) / total * 100))
                self.update_task(task_id, {
                    "progress": progress,
                    "current_step": f"正在迁移 {i + len(batch)}/{total}...",
                    "stats": MigrationStats(
                        total_records=total,
                        processed_records=i + len(batch),
                        success_records=success,
                        failed_records=failed,
                        skipped_records=skipped,
                    ),
                })

            # 完成
            self.update_task(task_id, {
                "status": MigrationStatus.COMPLETED,
                "progress": 100,
                "current_step": "迁移完成",
                "completed_at": datetime.now(),
                "rollback_data": RollbackData(
                    backup_collection=f"{task.target_collection}_backup_{int(datetime.now().timestamp())}",
                    can_rollback=True,
                ),
            })

            logger.info(f"Migration completed: {success} success, {failed} failed, {skipped} skipped")

        except Exception as e:
            self.update_task(task_id, {
                "status": MigrationStatus.FAILED,
                "current_step": f"迁移失败: {str(e)}",
                "completed_at": datetime.now(),
            })
            raise

        return self.tasks[task_id]

    def _apply_transformations(
        self,
        df: pd.DataFrame,
        mappings: List[FieldMapping]
    ) -> pd.DataFrame:
        """应用字段转换"""
        result = pd.DataFrame()

        for mapping in mappings:
            source_col = mapping.source_field
            target_col = mapping.target_field

            if source_col not in df.columns:
                if mapping.default_value is not None:
                    result[target_col] = mapping.default_value
                continue

            series = df[source_col].copy()

            # 应用转换
            if mapping.transform == TransformType.TRIM:
                series = series.astype(str).str.strip()
            elif mapping.transform == TransformType.UPPERCASE:
                series = series.astype(str).str.upper()
            elif mapping.transform == TransformType.LOWERCASE:
                series = series.astype(str).str.lower()
            elif mapping.transform == TransformType.DATE_FORMAT:
                format_str = mapping.transform_config.get("format", "%Y-%m-%d")
                series = pd.to_datetime(series).dt.strftime(format_str)

            result[target_col] = series

        return result

    async def rollback(self, task_id: str) -> bool:
        """回滚迁移"""
        task = self.tasks.get(task_id)
        if not task or not task.rollback_data or not task.rollback_data.can_rollback:
            return False

        self.update_task(task_id, {
            "current_step": "正在回滚...",
        })

        # 这里应该执行实际的回滚操作
        # 目前模拟

        self.update_task(task_id, {
            "status": MigrationStatus.ROLLED_BACK,
            "current_step": "已回滚",
            "rollback_data": RollbackData(
                backup_collection=task.rollback_data.backup_collection,
                can_rollback=False,
            ),
        })

        logger.info(f"Migration rolled back: {task_id}")
        return True

    def generate_report(self, task_id: str) -> str:
        """生成迁移报告"""
        task = self.tasks.get(task_id)
        if not task:
            return "任务不存在"

        duration = None
        if task.completed_at and task.started_at:
            duration = (task.completed_at - task.started_at).total_seconds()

        report = f"""# 数据迁移报告

## 基本信息
- 任务名称: {task.name}
- 目标表: {task.target_collection}
- 状态: {task.status}
- 创建时间: {task.created_at}
"""

        if task.completed_at:
            report += f"- 完成时间: {task.completed_at}\n"
        if duration:
            report += f"- 耗时: {int(duration)} 秒\n"

        report += f"""
## 迁移统计
- 总记录数: {task.stats.total_records}
- 成功: {task.stats.success_records} ✅
- 失败: {task.stats.failed_records} ❌
- 跳过: {task.stats.skipped_records} ⏭️
"""

        if task.stats.total_records > 0:
            rate = task.stats.success_records / task.stats.total_records * 100
            report += f"- 成功率: {rate:.1f}%\n"

        if task.errors:
            report += "\n## 错误详情 (前10条)\n"
            for err in task.errors[:10]:
                report += f"- 第 {err.row} 行: {err.error}\n"
            if len(task.errors) > 10:
                report += f"- ... 还有 {len(task.errors) - 10} 条错误\n"

        return report

    def get_supported_collections(self) -> List[str]:
        """获取支持的目标表"""
        return list(TARGET_COLLECTIONS.keys())

    def get_target_fields(self, collection: str) -> List[TargetField]:
        """获取目标表字段"""
        return TARGET_COLLECTIONS.get(collection, [])
