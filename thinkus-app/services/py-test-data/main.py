"""
测试数据自动生成服务

根据产品类型自动生成适合的测试数据，支持：
- 电商：商品、订单、用户、评价
- SaaS：管理员、团队、配置
- 内容站：文章、分类、标签
- 社交：用户、帖子、评论
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from faker import Faker
from pymongo import MongoClient
import redis
import httpx

# 初始化
app = FastAPI(title="Test Data Generator", version="1.0.0")
fake = Faker(['zh_CN', 'en_US'])

# 配置
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')


# ============================================================================
# 数据模型
# ============================================================================

class ProductType(str, Enum):
    ECOMMERCE = "ecommerce"
    SAAS = "saas"
    CONTENT = "content"
    SOCIAL = "social"
    BOOKING = "booking"
    EDUCATION = "education"
    HEALTHCARE = "healthcare"
    FINANCE = "finance"
    WEBAPP = "web-app"
    API = "api-service"


class DataCategory(str, Enum):
    USERS = "users"
    PRODUCTS = "products"
    ORDERS = "orders"
    ARTICLES = "articles"
    COMMENTS = "comments"
    SETTINGS = "settings"


class GenerateRequest(BaseModel):
    project_id: str
    product_type: ProductType
    database_uri: Optional[str] = None
    categories: Optional[List[DataCategory]] = None
    count: int = 10  # 每类数据生成数量
    locale: str = "zh_CN"


class GenerateResult(BaseModel):
    success: bool
    project_id: str
    generated: Dict[str, int]  # 类别 -> 生成数量
    sample_data: Dict[str, Any]  # 示例数据
    errors: List[str]
    duration_ms: int


# ============================================================================
# 数据生成器
# ============================================================================

class TestDataGenerator:
    """测试数据生成器"""

    def __init__(self, locale: str = "zh_CN"):
        self.fake = Faker([locale, 'en_US'])
        self.generated_ids: Dict[str, List[str]] = {}

    # ------------------------------------------------------------------------
    # 通用数据
    # ------------------------------------------------------------------------

    def generate_user(self, role: str = "user") -> Dict[str, Any]:
        """生成用户数据"""
        user_id = self.fake.uuid4()
        self.generated_ids.setdefault("users", []).append(user_id)

        return {
            "_id": user_id,
            "email": self.fake.email(),
            "name": self.fake.name(),
            "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_id[:8]}",
            "phone": self.fake.phone_number(),
            "role": role,
            "status": "active",
            "createdAt": self.fake.date_time_between(start_date="-1y", end_date="now").isoformat(),
            "lastLoginAt": self.fake.date_time_between(start_date="-30d", end_date="now").isoformat(),
            "profile": {
                "bio": self.fake.text(max_nb_chars=100),
                "location": self.fake.city(),
                "website": self.fake.url() if self.fake.boolean(chance_of_getting_true=30) else None
            }
        }

    def generate_admin(self) -> Dict[str, Any]:
        """生成管理员数据"""
        admin = self.generate_user(role="admin")
        admin["permissions"] = ["read", "write", "delete", "admin"]
        admin["department"] = self.fake.random_element(["技术部", "产品部", "运营部", "客服部"])
        return admin

    # ------------------------------------------------------------------------
    # 电商数据
    # ------------------------------------------------------------------------

    def generate_product(self) -> Dict[str, Any]:
        """生成商品数据"""
        product_id = self.fake.uuid4()
        self.generated_ids.setdefault("products", []).append(product_id)

        categories = ["服装", "数码", "家居", "美妆", "食品", "运动", "图书", "母婴"]

        price = round(self.fake.pyfloat(min_value=9.9, max_value=9999.0), 2)

        return {
            "_id": product_id,
            "name": self.fake.catch_phrase(),
            "description": self.fake.text(max_nb_chars=200),
            "price": price,
            "originalPrice": round(price * self.fake.pyfloat(min_value=1.1, max_value=1.5), 2),
            "category": self.fake.random_element(categories),
            "tags": self.fake.random_elements(["热销", "新品", "推荐", "限时", "包邮"], length=2, unique=True),
            "images": [
                f"https://picsum.photos/seed/{product_id[:8]}/400/400",
                f"https://picsum.photos/seed/{product_id[8:16]}/400/400"
            ],
            "stock": self.fake.random_int(min=0, max=1000),
            "sold": self.fake.random_int(min=0, max=5000),
            "rating": round(self.fake.pyfloat(min_value=3.5, max_value=5.0), 1),
            "reviewCount": self.fake.random_int(min=0, max=500),
            "status": self.fake.random_element(["active", "active", "active", "inactive"]),
            "createdAt": self.fake.date_time_between(start_date="-1y", end_date="now").isoformat()
        }

    def generate_order(self) -> Dict[str, Any]:
        """生成订单数据"""
        order_id = f"ORD{self.fake.random_number(digits=12)}"
        self.generated_ids.setdefault("orders", []).append(order_id)

        # 获取已生成的用户和商品
        user_ids = self.generated_ids.get("users", [self.fake.uuid4()])
        product_ids = self.generated_ids.get("products", [self.fake.uuid4()])

        items_count = self.fake.random_int(min=1, max=5)
        items = []
        total = 0

        for _ in range(items_count):
            price = round(self.fake.pyfloat(min_value=9.9, max_value=999.0), 2)
            quantity = self.fake.random_int(min=1, max=3)
            items.append({
                "productId": self.fake.random_element(product_ids),
                "name": self.fake.catch_phrase(),
                "price": price,
                "quantity": quantity,
                "subtotal": round(price * quantity, 2)
            })
            total += price * quantity

        statuses = ["pending", "paid", "shipped", "delivered", "completed", "cancelled"]
        status_weights = [10, 15, 20, 25, 25, 5]

        return {
            "_id": order_id,
            "userId": self.fake.random_element(user_ids),
            "items": items,
            "totalAmount": round(total, 2),
            "discountAmount": round(total * self.fake.pyfloat(min_value=0, max_value=0.2), 2),
            "shippingFee": self.fake.random_element([0, 0, 0, 5, 10, 15]),
            "status": self.fake.random_element(statuses),
            "paymentMethod": self.fake.random_element(["alipay", "wechat", "card", "balance"]),
            "shippingAddress": {
                "name": self.fake.name(),
                "phone": self.fake.phone_number(),
                "province": self.fake.province(),
                "city": self.fake.city(),
                "district": self.fake.district(),
                "address": self.fake.street_address()
            },
            "createdAt": self.fake.date_time_between(start_date="-3m", end_date="now").isoformat(),
            "paidAt": self.fake.date_time_between(start_date="-3m", end_date="now").isoformat() if self.fake.boolean() else None
        }

    def generate_review(self) -> Dict[str, Any]:
        """生成评价数据"""
        user_ids = self.generated_ids.get("users", [self.fake.uuid4()])
        product_ids = self.generated_ids.get("products", [self.fake.uuid4()])

        return {
            "_id": self.fake.uuid4(),
            "userId": self.fake.random_element(user_ids),
            "productId": self.fake.random_element(product_ids),
            "rating": self.fake.random_int(min=1, max=5),
            "content": self.fake.text(max_nb_chars=150),
            "images": [f"https://picsum.photos/seed/{self.fake.uuid4()[:8]}/200/200"] if self.fake.boolean(chance_of_getting_true=30) else [],
            "helpful": self.fake.random_int(min=0, max=100),
            "createdAt": self.fake.date_time_between(start_date="-6m", end_date="now").isoformat()
        }

    # ------------------------------------------------------------------------
    # 内容数据
    # ------------------------------------------------------------------------

    def generate_article(self) -> Dict[str, Any]:
        """生成文章数据"""
        article_id = self.fake.uuid4()
        self.generated_ids.setdefault("articles", []).append(article_id)

        user_ids = self.generated_ids.get("users", [self.fake.uuid4()])
        categories = ["技术", "产品", "设计", "运营", "创业", "生活", "教程", "资讯"]

        return {
            "_id": article_id,
            "title": self.fake.sentence(nb_words=10),
            "slug": self.fake.slug(),
            "summary": self.fake.text(max_nb_chars=150),
            "content": self._generate_markdown_content(),
            "authorId": self.fake.random_element(user_ids),
            "category": self.fake.random_element(categories),
            "tags": self.fake.random_elements(["Python", "JavaScript", "AI", "设计", "产品", "创业"], length=3, unique=True),
            "coverImage": f"https://picsum.photos/seed/{article_id[:8]}/800/400",
            "views": self.fake.random_int(min=10, max=10000),
            "likes": self.fake.random_int(min=0, max=500),
            "comments": self.fake.random_int(min=0, max=100),
            "status": self.fake.random_element(["published", "published", "published", "draft"]),
            "publishedAt": self.fake.date_time_between(start_date="-1y", end_date="now").isoformat(),
            "createdAt": self.fake.date_time_between(start_date="-1y", end_date="now").isoformat()
        }

    def _generate_markdown_content(self) -> str:
        """生成 Markdown 格式的文章内容"""
        sections = self.fake.random_int(min=3, max=6)
        content = []

        for i in range(sections):
            content.append(f"## {self.fake.sentence(nb_words=5)}")
            content.append("")
            for _ in range(self.fake.random_int(min=2, max=4)):
                content.append(self.fake.paragraph(nb_sentences=4))
                content.append("")

            # 随机添加代码块或列表
            if self.fake.boolean(chance_of_getting_true=30):
                content.append("```javascript")
                content.append(f"const {self.fake.word()} = () => {{")
                content.append(f"  console.log('{self.fake.sentence()}');")
                content.append("};")
                content.append("```")
                content.append("")

            if self.fake.boolean(chance_of_getting_true=30):
                for _ in range(3):
                    content.append(f"- {self.fake.sentence()}")
                content.append("")

        return "\n".join(content)

    def generate_comment(self) -> Dict[str, Any]:
        """生成评论数据"""
        user_ids = self.generated_ids.get("users", [self.fake.uuid4()])
        article_ids = self.generated_ids.get("articles", [self.fake.uuid4()])

        return {
            "_id": self.fake.uuid4(),
            "articleId": self.fake.random_element(article_ids),
            "userId": self.fake.random_element(user_ids),
            "content": self.fake.text(max_nb_chars=200),
            "likes": self.fake.random_int(min=0, max=50),
            "replyTo": None,
            "createdAt": self.fake.date_time_between(start_date="-6m", end_date="now").isoformat()
        }

    # ------------------------------------------------------------------------
    # SaaS 数据
    # ------------------------------------------------------------------------

    def generate_team(self) -> Dict[str, Any]:
        """生成团队数据"""
        team_id = self.fake.uuid4()
        self.generated_ids.setdefault("teams", []).append(team_id)

        return {
            "_id": team_id,
            "name": f"{self.fake.company()}团队",
            "slug": self.fake.slug(),
            "description": self.fake.catch_phrase(),
            "logo": f"https://api.dicebear.com/7.x/identicon/svg?seed={team_id[:8]}",
            "plan": self.fake.random_element(["free", "pro", "enterprise"]),
            "memberCount": self.fake.random_int(min=1, max=50),
            "settings": {
                "allowInvite": True,
                "defaultRole": "member",
                "features": self.fake.random_elements(["analytics", "api", "export", "sso"], length=2)
            },
            "createdAt": self.fake.date_time_between(start_date="-1y", end_date="now").isoformat()
        }

    def generate_project(self) -> Dict[str, Any]:
        """生成项目数据"""
        project_id = self.fake.uuid4()
        team_ids = self.generated_ids.get("teams", [self.fake.uuid4()])
        user_ids = self.generated_ids.get("users", [self.fake.uuid4()])

        return {
            "_id": project_id,
            "name": self.fake.catch_phrase(),
            "description": self.fake.text(max_nb_chars=150),
            "teamId": self.fake.random_element(team_ids),
            "ownerId": self.fake.random_element(user_ids),
            "status": self.fake.random_element(["active", "active", "archived", "draft"]),
            "priority": self.fake.random_element(["low", "medium", "high", "urgent"]),
            "dueDate": self.fake.date_time_between(start_date="now", end_date="+3m").isoformat(),
            "progress": self.fake.random_int(min=0, max=100),
            "tags": self.fake.random_elements(["重要", "紧急", "待定", "进行中"], length=2, unique=True),
            "createdAt": self.fake.date_time_between(start_date="-6m", end_date="now").isoformat()
        }

    # ------------------------------------------------------------------------
    # 预约数据
    # ------------------------------------------------------------------------

    def generate_booking(self) -> Dict[str, Any]:
        """生成预约数据"""
        user_ids = self.generated_ids.get("users", [self.fake.uuid4()])

        services = ["咨询服务", "健康检查", "美容护理", "课程培训", "场地预约", "维修服务"]

        start_time = self.fake.date_time_between(start_date="now", end_date="+1m")
        duration = self.fake.random_element([30, 60, 90, 120])  # 分钟

        return {
            "_id": self.fake.uuid4(),
            "userId": self.fake.random_element(user_ids),
            "service": self.fake.random_element(services),
            "staffId": self.fake.uuid4(),
            "staffName": self.fake.name(),
            "startTime": start_time.isoformat(),
            "endTime": (start_time + timedelta(minutes=duration)).isoformat(),
            "duration": duration,
            "status": self.fake.random_element(["pending", "confirmed", "completed", "cancelled"]),
            "notes": self.fake.text(max_nb_chars=100) if self.fake.boolean() else None,
            "price": round(self.fake.pyfloat(min_value=50, max_value=500), 2),
            "createdAt": self.fake.date_time_between(start_date="-1m", end_date="now").isoformat()
        }

    # ------------------------------------------------------------------------
    # 按产品类型生成数据
    # ------------------------------------------------------------------------

    def generate_for_product_type(
        self,
        product_type: ProductType,
        count: int = 10
    ) -> Dict[str, List[Dict[str, Any]]]:
        """根据产品类型生成相应数据"""

        data: Dict[str, List[Dict[str, Any]]] = {}

        # 所有类型都需要用户
        data["users"] = [self.generate_user() for _ in range(count)]
        data["admins"] = [self.generate_admin() for _ in range(max(1, count // 5))]

        if product_type == ProductType.ECOMMERCE:
            data["products"] = [self.generate_product() for _ in range(count * 2)]
            data["orders"] = [self.generate_order() for _ in range(count)]
            data["reviews"] = [self.generate_review() for _ in range(count * 2)]

        elif product_type == ProductType.CONTENT:
            data["articles"] = [self.generate_article() for _ in range(count)]
            data["comments"] = [self.generate_comment() for _ in range(count * 3)]

        elif product_type == ProductType.SAAS:
            data["teams"] = [self.generate_team() for _ in range(max(1, count // 3))]
            data["projects"] = [self.generate_project() for _ in range(count)]

        elif product_type == ProductType.BOOKING:
            data["bookings"] = [self.generate_booking() for _ in range(count)]

        elif product_type == ProductType.SOCIAL:
            data["articles"] = [self.generate_article() for _ in range(count)]  # 作为帖子
            data["comments"] = [self.generate_comment() for _ in range(count * 5)]

        elif product_type in [ProductType.WEBAPP, ProductType.API]:
            # 通用 Web 应用，生成基础数据
            data["settings"] = [{
                "_id": "app_settings",
                "siteName": self.fake.company(),
                "siteDescription": self.fake.catch_phrase(),
                "contactEmail": self.fake.email(),
                "features": {
                    "registration": True,
                    "comments": True,
                    "notifications": True
                },
                "theme": {
                    "primaryColor": self.fake.hex_color(),
                    "mode": "light"
                }
            }]

        else:
            # 默认生成一些通用数据
            data["items"] = [self.generate_product() for _ in range(count)]

        return data


# ============================================================================
# 数据库操作
# ============================================================================

class DatabaseWriter:
    """数据库写入器"""

    def __init__(self, uri: str):
        self.client = MongoClient(uri)

    async def write_data(
        self,
        database_name: str,
        data: Dict[str, List[Dict[str, Any]]]
    ) -> Dict[str, int]:
        """写入数据到数据库"""
        db = self.client[database_name]
        results = {}

        for collection_name, documents in data.items():
            if not documents:
                continue

            collection = db[collection_name]

            # 清空现有测试数据（带 _test_ 前缀的）
            # 或者直接插入
            try:
                result = collection.insert_many(documents)
                results[collection_name] = len(result.inserted_ids)
            except Exception as e:
                results[collection_name] = 0
                print(f"Error writing {collection_name}: {e}")

        return results

    def close(self):
        self.client.close()


# ============================================================================
# API 路由
# ============================================================================

@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "service": "test-data-generator"}


@app.post("/generate", response_model=GenerateResult)
async def generate_test_data(request: GenerateRequest):
    """生成测试数据"""
    start_time = datetime.now()
    errors = []

    try:
        # 创建生成器
        generator = TestDataGenerator(locale=request.locale)

        # 生成数据
        data = generator.generate_for_product_type(
            product_type=request.product_type,
            count=request.count
        )

        # 统计生成数量
        generated = {k: len(v) for k, v in data.items()}

        # 获取示例数据（每类取第一条）
        sample_data = {k: v[0] if v else None for k, v in data.items()}

        # 如果提供了数据库 URI，写入数据库
        if request.database_uri:
            try:
                writer = DatabaseWriter(request.database_uri)
                db_name = f"thinkus_project_{request.project_id[:8]}"
                write_results = await writer.write_data(db_name, data)
                writer.close()

                # 更新生成统计
                for k, v in write_results.items():
                    if v == 0:
                        errors.append(f"写入 {k} 失败")
            except Exception as e:
                errors.append(f"数据库写入错误: {str(e)}")

        duration = int((datetime.now() - start_time).total_seconds() * 1000)

        return GenerateResult(
            success=len(errors) == 0,
            project_id=request.project_id,
            generated=generated,
            sample_data=sample_data,
            errors=errors,
            duration_ms=duration
        )

    except Exception as e:
        duration = int((datetime.now() - start_time).total_seconds() * 1000)
        return GenerateResult(
            success=False,
            project_id=request.project_id,
            generated={},
            sample_data={},
            errors=[str(e)],
            duration_ms=duration
        )


@app.post("/generate/preview")
async def preview_test_data(request: GenerateRequest):
    """预览测试数据（不写入数据库）"""
    generator = TestDataGenerator(locale=request.locale)
    data = generator.generate_for_product_type(
        product_type=request.product_type,
        count=min(request.count, 3)  # 预览最多3条
    )
    return data


@app.get("/templates/{product_type}")
async def get_data_template(product_type: ProductType):
    """获取产品类型对应的数据模板"""
    generator = TestDataGenerator()

    templates = {
        ProductType.ECOMMERCE: {
            "collections": ["users", "admins", "products", "orders", "reviews"],
            "sample": generator.generate_for_product_type(ProductType.ECOMMERCE, count=1)
        },
        ProductType.CONTENT: {
            "collections": ["users", "admins", "articles", "comments"],
            "sample": generator.generate_for_product_type(ProductType.CONTENT, count=1)
        },
        ProductType.SAAS: {
            "collections": ["users", "admins", "teams", "projects"],
            "sample": generator.generate_for_product_type(ProductType.SAAS, count=1)
        },
        ProductType.BOOKING: {
            "collections": ["users", "admins", "bookings"],
            "sample": generator.generate_for_product_type(ProductType.BOOKING, count=1)
        }
    }

    return templates.get(product_type, {
        "collections": ["users", "admins", "items"],
        "sample": generator.generate_for_product_type(product_type, count=1)
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9001)
