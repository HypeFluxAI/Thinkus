# Thinkus v13 - 接口契约机制

> 契约驱动开发：接口定义先于代码实现

---

## 基本信息

| 字段 | 值 |
|------|-----|
| 功能名称 | 接口契约机制 |
| 优先级 | P0 |
| 预估复杂度 | 中等 |
| 关联模块 | Go编排层、开发流程 |

---

## 1. 核心理念

```yaml
契约驱动开发:
  - 先定义接口，再开发代码
  - 前后端可并行开发
  - 契约就是"合同"，各方按约定执行
  - 契约变更需要版本管理

好处:
  - 避免前后端联调时发现接口不一致
  - 可并行开发，提高效率
  - 有明确的验收标准
  - 便于自动化测试
```

---

## 2. 契约结构

### 2.1 完整契约定义

```python
@dataclass
class InterfaceContract:
    """接口契约 - 各模块开发的依据"""

    feature_id: str
    feature_name: str
    version: str  # 契约版本

    # API定义
    api: APIContract

    # 数据库定义
    database: DatabaseContract

    # 前端定义
    frontend: FrontendContract

    # 创建信息
    created_at: datetime
    created_by: str  # mike_pm

    # 变更历史
    history: List[ContractChange]
```

### 2.2 API契约

```python
@dataclass
class APIContract:
    method: str          # GET, POST, PUT, DELETE
    path: str            # /api/auth/login
    description: str

    # 请求定义
    request: RequestContract

    # 响应定义
    response: ResponseContract

    # 错误定义
    errors: List[ErrorContract]

    # 认证要求
    auth_required: bool
    auth_type: str       # bearer, api_key, none

@dataclass
class RequestContract:
    headers: Dict[str, str]
    query_params: Dict[str, FieldDef]
    body: Dict[str, FieldDef]

@dataclass
class ResponseContract:
    status_code: int
    headers: Dict[str, str]
    body: Dict[str, FieldDef]

@dataclass
class ErrorContract:
    code: str            # INVALID_CREDENTIALS
    message: str         # 邮箱或密码错误
    status_code: int     # 401

@dataclass
class FieldDef:
    type: str            # string, number, boolean, object, array
    required: bool
    description: str
    example: Any
    validation: Optional[str]  # email, url, min:1, max:100
```

### 2.3 数据库契约

```python
@dataclass
class DatabaseContract:
    table: str           # users
    description: str

    # 字段定义
    fields: Dict[str, FieldSchema]

    # 索引
    indexes: List[IndexDef]

    # 关系
    relations: List[RelationDef]

@dataclass
class FieldSchema:
    type: str            # uuid, varchar, int, timestamp, jsonb
    nullable: bool
    default: Optional[str]
    constraints: List[str]  # PRIMARY KEY, UNIQUE, NOT NULL

@dataclass
class IndexDef:
    name: str
    fields: List[str]
    unique: bool

@dataclass
class RelationDef:
    type: str            # one-to-one, one-to-many, many-to-many
    target_table: str
    foreign_key: str
```

### 2.4 前端契约

```python
@dataclass
class FrontendContract:
    page: str            # /login
    description: str

    # 组件列表
    components: List[str]

    # 表单字段
    form_fields: List[FormFieldDef]

    # 状态定义
    states: List[str]    # idle, loading, success, error

    # 错误处理映射
    error_handling: Dict[str, str]  # ERROR_CODE -> 友好提示

@dataclass
class FormFieldDef:
    name: str
    type: str            # text, password, email, select
    label: str
    placeholder: str
    validation: Optional[str]
```

---

## 3. 契约示例

### 3.1 登录功能契约

```python
login_contract = InterfaceContract(
    feature_id='F001',
    feature_name='用户登录',
    version='1.0.0',

    api=APIContract(
        method='POST',
        path='/api/auth/login',
        description='用户邮箱密码登录',
        auth_required=False,

        request=RequestContract(
            headers={},
            query_params={},
            body={
                'email': FieldDef(
                    type='string',
                    required=True,
                    description='用户邮箱',
                    example='user@example.com',
                    validation='email'
                ),
                'password': FieldDef(
                    type='string',
                    required=True,
                    description='用户密码',
                    example='password123',
                    validation='min:6'
                ),
            }
        ),

        response=ResponseContract(
            status_code=200,
            headers={},
            body={
                'token': FieldDef(type='string', required=True, description='JWT Token'),
                'user': FieldDef(
                    type='object',
                    required=True,
                    description='用户信息',
                    example={'id': 'user_123', 'email': 'user@example.com', 'name': 'John'}
                )
            }
        ),

        errors=[
            ErrorContract(code='INVALID_CREDENTIALS', message='邮箱或密码错误', status_code=401),
            ErrorContract(code='USER_NOT_FOUND', message='用户不存在', status_code=404),
            ErrorContract(code='ACCOUNT_LOCKED', message='账户已锁定', status_code=403),
        ]
    ),

    database=DatabaseContract(
        table='users',
        description='用户表',
        fields={
            'id': FieldSchema(type='uuid', nullable=False, constraints=['PRIMARY KEY']),
            'email': FieldSchema(type='varchar(255)', nullable=False, constraints=['UNIQUE', 'NOT NULL']),
            'password_hash': FieldSchema(type='varchar(255)', nullable=False, constraints=['NOT NULL']),
            'name': FieldSchema(type='varchar(100)', nullable=True),
            'created_at': FieldSchema(type='timestamp', nullable=False, default='NOW()'),
        },
        indexes=[
            IndexDef(name='idx_users_email', fields=['email'], unique=True)
        ],
        relations=[]
    ),

    frontend=FrontendContract(
        page='/login',
        description='登录页面',
        components=['LoginForm', 'ErrorMessage', 'SubmitButton'],
        form_fields=[
            FormFieldDef(name='email', type='email', label='邮箱', placeholder='请输入邮箱'),
            FormFieldDef(name='password', type='password', label='密码', placeholder='请输入密码'),
        ],
        states=['idle', 'loading', 'success', 'error'],
        error_handling={
            'INVALID_CREDENTIALS': '邮箱或密码错误，请重试',
            'USER_NOT_FOUND': '用户不存在，请先注册',
            'ACCOUNT_LOCKED': '账户已锁定，请联系客服',
        }
    ),

    created_at=datetime.now(),
    created_by='mike_pm',
    history=[]
)
```

---

## 4. 契约管理

### 4.1 契约管理器

```python
class ContractManager:
    """契约管理器"""

    def __init__(self):
        self.contracts: Dict[str, InterfaceContract] = {}
        self.versions: Dict[str, List[ContractVersion]] = {}

    async def create_contract(self, feature: Feature) -> InterfaceContract:
        """为功能创建契约"""

        # 1. Mike分析功能，生成契约
        contract = await self.mike.generate_contract(feature)

        # 2. 存储契约
        self.contracts[feature.id] = contract

        # 3. 创建版本记录
        self.versions[feature.id] = [ContractVersion(
            version='1.0.0',
            contract=contract,
            created_at=datetime.now()
        )]

        return contract

    async def update_contract(self, feature_id: str, changes: Dict) -> InterfaceContract:
        """更新契约"""

        old_contract = self.contracts[feature_id]

        # 1. 应用变更
        new_contract = self._apply_changes(old_contract, changes)

        # 2. 升级版本号
        new_contract.version = self._bump_version(old_contract.version, changes)

        # 3. 记录变更历史
        new_contract.history.append(ContractChange(
            from_version=old_contract.version,
            to_version=new_contract.version,
            changes=changes,
            changed_at=datetime.now()
        ))

        # 4. 保存新版本
        self.contracts[feature_id] = new_contract
        self.versions[feature_id].append(ContractVersion(
            version=new_contract.version,
            contract=new_contract,
            created_at=datetime.now()
        ))

        return new_contract

    def _bump_version(self, current: str, changes: Dict) -> str:
        """根据变更类型升级版本号"""
        major, minor, patch = map(int, current.split('.'))

        if 'breaking_changes' in changes:
            return f"{major + 1}.0.0"
        elif 'new_fields' in changes:
            return f"{major}.{minor + 1}.0"
        else:
            return f"{major}.{minor}.{patch + 1}"
```

### 4.2 契约验证

```python
class ContractValidator:
    """契约验证器"""

    async def validate_api_response(self, contract: APIContract, response: dict) -> ValidationResult:
        """验证API响应是否符合契约"""

        errors = []

        # 1. 验证必填字段
        for field_name, field_def in contract.response.body.items():
            if field_def.required and field_name not in response:
                errors.append(f"Missing required field: {field_name}")

        # 2. 验证字段类型
        for field_name, value in response.items():
            if field_name in contract.response.body:
                field_def = contract.response.body[field_name]
                if not self._check_type(value, field_def.type):
                    errors.append(f"Invalid type for {field_name}: expected {field_def.type}")

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors
        )

    async def validate_database_schema(self, contract: DatabaseContract, schema: dict) -> ValidationResult:
        """验证数据库Schema是否符合契约"""
        # 类似实现...
        pass

    async def validate_frontend_states(self, contract: FrontendContract, component: dict) -> ValidationResult:
        """验证前端组件是否处理了所有状态"""
        # 类似实现...
        pass
```

---

## 5. 基于契约的代码生成

### 5.1 后端代码生成

```python
class ContractBasedBackendGenerator:

    async def generate(self, contract: InterfaceContract) -> str:
        prompt = f"""基于以下接口契约生成Node.js Express API:

路径: {contract.api.method} {contract.api.path}
请求参数: {contract.api.request.body}
响应格式: {contract.api.response.body}
错误码: {[e.__dict__ for e in contract.api.errors]}
数据库表: {contract.database.table}
字段: {contract.database.fields}

要求:
1. 使用Express框架
2. 使用Prisma ORM
3. 完整的参数校验 (zod)
4. 所有错误码都要处理
5. 返回格式与契约一致

生成完整可运行的代码。"""

        return await self.ai.chat('david_tech', prompt)
```

### 5.2 前端代码生成

```python
class ContractBasedFrontendGenerator:

    async def generate(self, contract: InterfaceContract, design: DesignSpec) -> str:
        prompt = f"""基于以下接口契约和设计规范生成React组件:

页面: {contract.frontend.page}
API: {contract.api.method} {contract.api.path}
表单字段: {contract.frontend.form_fields}
状态: {contract.frontend.states}
错误处理: {contract.frontend.error_handling}
设计规范: {design}

要求:
1. 使用React + TailwindCSS
2. 使用React Query调用API
3. 处理所有状态 (idle/loading/success/error)
4. 所有错误码都有友好提示
5. 遵循设计规范

生成完整的组件代码。"""

        return await self.ai.chat('elena_ux', prompt)
```

### 5.3 数据库Migration生成

```python
class ContractBasedMigrationGenerator:

    async def generate(self, contract: InterfaceContract) -> str:
        prompt = f"""基于以下契约生成Prisma Schema和Migration:

表: {contract.database.table}
字段: {contract.database.fields}
索引: {contract.database.indexes}
关系: {contract.database.relations}

生成:
1. schema.prisma 文件内容
2. migration.sql 文件内容"""

        return await self.ai.chat('sam_db', prompt)
```

---

## 6. 契约同步

### 6.1 跨模块同步

```python
class ContractSynchronizer:
    """契约同步器"""

    async def sync_to_all_modules(self, contract: InterfaceContract):
        """同步契约到所有模块"""

        # 1. 通知Go编排层
        await self.go_client.update_contract(contract)

        # 2. 通知Python AI层
        await self.python_client.update_contract(contract)

        # 3. 更新前端类型定义
        await self._generate_typescript_types(contract)

        # 4. 更新API文档
        await self._update_api_docs(contract)

    async def _generate_typescript_types(self, contract: InterfaceContract):
        """生成TypeScript类型定义"""

        types = f"""
// Auto-generated from contract {contract.feature_id} v{contract.version}

export interface {contract.feature_name.replace(' ', '')}Request {{
{self._fields_to_ts(contract.api.request.body)}
}}

export interface {contract.feature_name.replace(' ', '')}Response {{
{self._fields_to_ts(contract.api.response.body)}
}}

export type {contract.feature_name.replace(' ', '')}Error =
{' | '.join([f"'{e.code}'" for e in contract.api.errors])};
"""

        await self.write_file(f"src/types/{contract.feature_id}.ts", types)
```

---

## 涉及文件

```yaml
新建:
  - services/go-orchestrator/contract/manager.go
  - services/go-orchestrator/contract/validator.go
  - services/go-orchestrator/contract/sync.go
  - services/py-ai-engine/contract/generator.py
  - thinkus-app/src/lib/contract/types.ts

修改:
  - services/go-orchestrator/proto/contract.proto

参考:
  - 04-development-workflow.md (开发流程)
```

---

## 验收标准

- [ ] 契约结构完整 (API/DB/Frontend)
- [ ] 契约版本管理正常
- [ ] 基于契约的代码生成正确
- [ ] 契约验证器工作正常
- [ ] 跨模块同步正常

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-01-17 | v1.0 | 从完整规格文档拆分 | Claude Code |
