"""
测试数据生成器
使用 Faker 生成中文友好的测试数据
"""

import json
import random
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from faker import Faker

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


class TestDataGenerator:
    """测试数据生成器"""

    def __init__(self, locale: str = "zh_CN"):
        self.fake = Faker(locale)
        self.fake_en = Faker("en_US")  # 用于生成英文数据

        # 缓存生成的关联数据
        self._user_ids: List[str] = []
        self._product_ids: List[str] = []
        self._category_ids: List[str] = []
        self._customer_ids: List[str] = []
        self._company_ids: List[str] = []

    def generate_for_product_type(
        self,
        project_id: str,
        product_type: ProductType,
        scale: str = "small",  # small/medium/large
        quality: DataQuality = DataQuality.REALISTIC,
    ) -> GenerationResult:
        """根据产品类型生成完整测试数据集"""
        start_time = datetime.now()

        # 获取该产品类型需要的数据
        data_types = PRODUCT_TYPE_DATA_NEEDS.get(product_type, [DataType.USER])

        # 根据规模调整数量
        scale_multiplier = {"small": 0.5, "medium": 1.0, "large": 2.0}.get(scale, 1.0)

        all_data: List[GeneratedData] = []
        total_records = 0

        # 按依赖顺序生成数据
        for data_type in self._sort_by_dependency(data_types):
            count = int(DEFAULT_COUNTS.get(data_type, 10) * scale_multiplier)

            config = GenerationConfig(
                data_type=data_type,
                count=count,
                quality=quality,
                locale="zh_CN",
                include_relations=True,
            )

            generated = self._generate_data(config)
            all_data.append(generated)
            total_records += generated.count

        duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

        return GenerationResult(
            task_id=str(uuid.uuid4()),
            success=True,
            data=all_data,
            total_records=total_records,
            duration_ms=duration_ms,
            output_files=[],
            errors=[],
        )

    def generate_data(self, config: GenerationConfig) -> GeneratedData:
        """生成指定类型的数据"""
        return self._generate_data(config)

    def _generate_data(self, config: GenerationConfig) -> GeneratedData:
        """内部生成数据方法"""
        generator_map = {
            DataType.USER: self._generate_users,
            DataType.PRODUCT: self._generate_products,
            DataType.ORDER: self._generate_orders,
            DataType.CUSTOMER: self._generate_customers,
            DataType.ARTICLE: self._generate_articles,
            DataType.COMMENT: self._generate_comments,
            DataType.CATEGORY: self._generate_categories,
            DataType.ADDRESS: self._generate_addresses,
            DataType.COMPANY: self._generate_companies,
            DataType.TRANSACTION: self._generate_transactions,
        }

        generator = generator_map.get(config.data_type)
        if not generator:
            return GeneratedData(
                data_type=config.data_type,
                records=[],
                count=0,
                metadata={"error": "Unknown data type"},
            )

        records = generator(config.count, config.quality)

        return GeneratedData(
            data_type=config.data_type,
            records=records,
            count=len(records),
            metadata={
                "quality": config.quality,
                "locale": config.locale,
                "generated_at": datetime.now().isoformat(),
            },
        )

    # ========== 数据生成方法 ==========

    def _generate_users(
        self, count: int, quality: DataQuality
    ) -> List[Dict[str, Any]]:
        """生成用户数据"""
        users = []
        roles = ["admin", "user", "manager", "editor", "viewer"]
        statuses = ["active", "inactive", "pending", "suspended"]

        for i in range(count):
            user_id = str(uuid.uuid4())
            self._user_ids.append(user_id)

            # 生成中文名字
            name = self.fake.name()

            # 生成用户名（拼音或英文）
            username = self.fake_en.user_name() + str(random.randint(100, 999))

            user = {
                "id": user_id,
                "username": username,
                "email": self.fake_en.email(),
                "name": name,
                "phone": self._generate_chinese_phone(),
                "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={username}",
                "role": random.choice(roles),
                "status": random.choices(statuses, weights=[0.7, 0.1, 0.15, 0.05])[0],
                "created_at": self._random_date(-365, 0).isoformat(),
                "last_login_at": self._random_date(-30, 0).isoformat(),
            }

            if quality == DataQuality.REALISTIC:
                user.update({
                    "bio": self.fake.sentence(nb_words=10),
                    "company": self.fake.company(),
                    "job_title": self.fake.job(),
                    "address": self.fake.address(),
                    "website": self.fake_en.url() if random.random() > 0.5 else None,
                    "social": {
                        "wechat": f"wx_{username}" if random.random() > 0.3 else None,
                        "weibo": f"@{name}" if random.random() > 0.5 else None,
                    },
                })

            users.append(user)

        return users

    def _generate_products(
        self, count: int, quality: DataQuality
    ) -> List[Dict[str, Any]]:
        """生成产品数据"""
        products = []
        statuses = ["active", "inactive", "out_of_stock", "discontinued"]

        # 中文产品名称模板
        product_templates = [
            "{adj}{noun}",
            "{brand}{noun}",
            "{adj}{brand}{noun}",
        ]
        adjectives = ["精品", "优质", "高端", "经典", "时尚", "简约", "智能", "便携", "专业", "商务"]
        nouns = ["手机", "电脑", "耳机", "手表", "背包", "键盘", "鼠标", "显示器", "相机", "音箱",
                 "T恤", "外套", "裤子", "鞋子", "帽子", "包包", "眼镜", "手环", "充电器", "数据线"]
        brands = ["科技", "优品", "智选", "精选", "臻品", "品质", "尊享", "旗舰", "新款", "限定"]

        for i in range(count):
            product_id = str(uuid.uuid4())
            self._product_ids.append(product_id)

            # 生成产品名
            template = random.choice(product_templates)
            name = template.format(
                adj=random.choice(adjectives),
                noun=random.choice(nouns),
                brand=random.choice(brands),
            )

            # 生成价格（符合中国定价习惯）
            base_price = random.choice([9.9, 19.9, 29.9, 49.9, 99, 199, 299, 499, 799, 999, 1299, 1999, 2999])
            price = base_price

            product = {
                "id": product_id,
                "name": name,
                "sku": f"SKU{random.randint(100000, 999999)}",
                "price": price,
                "original_price": round(price * random.uniform(1.1, 1.5), 2),
                "stock": random.randint(0, 1000),
                "status": random.choices(statuses, weights=[0.7, 0.1, 0.15, 0.05])[0],
                "category_id": random.choice(self._category_ids) if self._category_ids else None,
                "created_at": self._random_date(-180, 0).isoformat(),
                "updated_at": self._random_date(-30, 0).isoformat(),
            }

            if quality == DataQuality.REALISTIC:
                product.update({
                    "description": self.fake.paragraph(nb_sentences=3),
                    "images": [
                        f"https://picsum.photos/400/400?random={random.randint(1, 1000)}"
                        for _ in range(random.randint(1, 5))
                    ],
                    "specifications": {
                        "品牌": random.choice(brands),
                        "型号": f"Model-{random.randint(1000, 9999)}",
                        "产地": random.choice(["中国", "日本", "韩国", "美国", "德国"]),
                        "保修": random.choice(["1年", "2年", "3年"]),
                    },
                    "tags": random.sample(["热销", "新品", "促销", "限时", "精选", "推荐"], k=random.randint(1, 3)),
                    "rating": round(random.uniform(3.5, 5.0), 1),
                    "review_count": random.randint(0, 5000),
                    "sales_count": random.randint(0, 10000),
                })

            products.append(product)

        return products

    def _generate_orders(
        self, count: int, quality: DataQuality
    ) -> List[Dict[str, Any]]:
        """生成订单数据"""
        orders = []
        statuses = ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"]
        payment_methods = ["alipay", "wechat_pay", "credit_card", "bank_transfer"]

        for i in range(count):
            order_id = str(uuid.uuid4())

            # 生成订单号（符合中国习惯）
            order_number = f"{datetime.now().strftime('%Y%m%d')}{random.randint(100000, 999999)}"

            # 随机选择用户和产品
            user_id = random.choice(self._user_ids) if self._user_ids else str(uuid.uuid4())
            num_items = random.randint(1, 5)
            items = []

            total_amount = 0
            for _ in range(num_items):
                product_id = random.choice(self._product_ids) if self._product_ids else str(uuid.uuid4())
                quantity = random.randint(1, 3)
                unit_price = random.choice([9.9, 29.9, 99, 199, 499, 999])
                item_total = round(unit_price * quantity, 2)
                total_amount += item_total

                items.append({
                    "product_id": product_id,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "total": item_total,
                })

            order = {
                "id": order_id,
                "order_number": order_number,
                "user_id": user_id,
                "status": random.choices(statuses, weights=[0.1, 0.15, 0.2, 0.4, 0.1, 0.05])[0],
                "items": items,
                "total_amount": round(total_amount, 2),
                "payment_method": random.choice(payment_methods),
                "created_at": self._random_date(-90, 0).isoformat(),
            }

            if quality == DataQuality.REALISTIC:
                order.update({
                    "shipping_address": {
                        "name": self.fake.name(),
                        "phone": self._generate_chinese_phone(),
                        "province": self.fake.province(),
                        "city": self.fake.city_name(),
                        "district": self.fake.district(),
                        "address": self.fake.street_address(),
                    },
                    "shipping_fee": random.choice([0, 5, 10, 15]),
                    "discount_amount": round(total_amount * random.uniform(0, 0.2), 2),
                    "coupon_code": f"COUPON{random.randint(1000, 9999)}" if random.random() > 0.7 else None,
                    "remark": self.fake.sentence() if random.random() > 0.8 else None,
                    "paid_at": self._random_date(-89, 0).isoformat() if order["status"] != "pending" else None,
                    "shipped_at": self._random_date(-60, 0).isoformat() if order["status"] in ["shipped", "delivered"] else None,
                    "delivered_at": self._random_date(-30, 0).isoformat() if order["status"] == "delivered" else None,
                })

            orders.append(order)

        return orders

    def _generate_customers(
        self, count: int, quality: DataQuality
    ) -> List[Dict[str, Any]]:
        """生成客户数据"""
        customers = []
        levels = ["普通", "银卡", "金卡", "钻石"]
        sources = ["官网", "微信", "淘宝", "抖音", "推荐", "广告"]

        for i in range(count):
            customer_id = str(uuid.uuid4())
            self._customer_ids.append(customer_id)

            name = self.fake.name()

            customer = {
                "id": customer_id,
                "name": name,
                "email": self.fake_en.email(),
                "phone": self._generate_chinese_phone(),
                "level": random.choices(levels, weights=[0.5, 0.25, 0.15, 0.1])[0],
                "source": random.choice(sources),
                "created_at": self._random_date(-365, 0).isoformat(),
            }

            if quality == DataQuality.REALISTIC:
                customer.update({
                    "gender": random.choice(["male", "female"]),
                    "birthday": self.fake.date_of_birth(minimum_age=18, maximum_age=60).isoformat(),
                    "company": self.fake.company() if random.random() > 0.5 else None,
                    "job_title": self.fake.job() if random.random() > 0.5 else None,
                    "address": {
                        "province": self.fake.province(),
                        "city": self.fake.city_name(),
                        "district": self.fake.district(),
                        "street": self.fake.street_address(),
                    },
                    "total_orders": random.randint(0, 100),
                    "total_spent": round(random.uniform(0, 50000), 2),
                    "last_order_at": self._random_date(-90, 0).isoformat() if random.random() > 0.3 else None,
                    "tags": random.sample(["高价值", "活跃", "沉睡", "新客", "老客", "VIP"], k=random.randint(0, 3)),
                    "notes": self.fake.sentence() if random.random() > 0.8 else None,
                })

            customers.append(customer)

        return customers

    def _generate_articles(
        self, count: int, quality: DataQuality
    ) -> List[Dict[str, Any]]:
        """生成文章数据"""
        articles = []
        statuses = ["draft", "published", "archived"]

        for i in range(count):
            article_id = str(uuid.uuid4())

            # 生成中文标题
            title_templates = [
                "如何{verb}{noun}",
                "{adj}的{noun}指南",
                "{num}个{noun}技巧",
                "关于{noun}你应该知道的事",
                "{year}年{noun}趋势分析",
            ]
            verbs = ["提升", "优化", "改善", "掌握", "学习", "理解"]
            nouns = ["效率", "体验", "设计", "开发", "营销", "运营", "管理", "产品"]
            adjectives = ["完整", "实用", "高效", "专业", "入门", "进阶"]

            title = random.choice(title_templates).format(
                verb=random.choice(verbs),
                noun=random.choice(nouns),
                adj=random.choice(adjectives),
                num=random.choice(["5", "7", "10", "12", "20"]),
                year=random.choice(["2024", "2025", "2026"]),
            )

            article = {
                "id": article_id,
                "title": title,
                "slug": f"article-{random.randint(10000, 99999)}",
                "status": random.choices(statuses, weights=[0.2, 0.7, 0.1])[0],
                "author_id": random.choice(self._user_ids) if self._user_ids else str(uuid.uuid4()),
                "category_id": random.choice(self._category_ids) if self._category_ids else None,
                "created_at": self._random_date(-180, 0).isoformat(),
                "published_at": self._random_date(-90, 0).isoformat(),
            }

            if quality == DataQuality.REALISTIC:
                article.update({
                    "summary": self.fake.paragraph(nb_sentences=2),
                    "content": "\n\n".join([self.fake.paragraph(nb_sentences=5) for _ in range(5)]),
                    "cover_image": f"https://picsum.photos/800/400?random={random.randint(1, 1000)}",
                    "tags": random.sample(["技术", "产品", "设计", "运营", "营销", "管理", "趋势"], k=random.randint(1, 4)),
                    "view_count": random.randint(0, 10000),
                    "like_count": random.randint(0, 500),
                    "comment_count": random.randint(0, 100),
                    "share_count": random.randint(0, 200),
                    "is_featured": random.random() > 0.9,
                    "is_pinned": random.random() > 0.95,
                })

            articles.append(article)

        return articles

    def _generate_comments(
        self, count: int, quality: DataQuality
    ) -> List[Dict[str, Any]]:
        """生成评论数据"""
        comments = []

        # 中文评论模板
        positive_templates = [
            "很好，很实用！",
            "内容详细，收藏了",
            "学到很多，感谢分享",
            "写得不错，期待更多",
            "干货满满，赞！",
            "这正是我需要的",
            "专业，点赞",
            "讲解清晰，易懂",
        ]
        neutral_templates = [
            "还可以吧",
            "一般般",
            "内容有点短",
            "希望能更详细一些",
            "部分内容不太认同",
        ]
        negative_templates = [
            "不太实用",
            "内容太浅",
            "有错误的地方",
            "不推荐",
        ]

        for i in range(count):
            comment_id = str(uuid.uuid4())

            # 随机选择评论类型
            sentiment = random.choices(
                ["positive", "neutral", "negative"],
                weights=[0.7, 0.2, 0.1]
            )[0]

            if sentiment == "positive":
                content = random.choice(positive_templates)
            elif sentiment == "neutral":
                content = random.choice(neutral_templates)
            else:
                content = random.choice(negative_templates)

            if quality == DataQuality.REALISTIC:
                # 添加更多细节
                content += " " + self.fake.sentence() if random.random() > 0.5 else ""

            comment = {
                "id": comment_id,
                "content": content,
                "user_id": random.choice(self._user_ids) if self._user_ids else str(uuid.uuid4()),
                "target_type": random.choice(["article", "product"]),
                "target_id": str(uuid.uuid4()),
                "parent_id": None,
                "status": random.choices(["approved", "pending", "rejected"], weights=[0.85, 0.1, 0.05])[0],
                "created_at": self._random_date(-90, 0).isoformat(),
            }

            if quality == DataQuality.REALISTIC:
                comment.update({
                    "like_count": random.randint(0, 100),
                    "is_author_reply": random.random() > 0.9,
                    "ip_address": self.fake.ipv4() if random.random() > 0.5 else None,
                })

            comments.append(comment)

        return comments

    def _generate_categories(
        self, count: int, quality: DataQuality
    ) -> List[Dict[str, Any]]:
        """生成分类数据"""
        categories = []

        # 中文分类名
        category_names = [
            "数码科技", "服装配饰", "家居生活", "美食饮品", "运动户外",
            "图书文具", "母婴用品", "美妆个护", "汽车用品", "医药保健",
            "技术文章", "产品评测", "行业动态", "教程指南", "案例分享",
            "公司新闻", "活动通知", "用户故事", "常见问题", "帮助文档",
        ]

        selected_names = random.sample(category_names, min(count, len(category_names)))

        for i, name in enumerate(selected_names):
            category_id = str(uuid.uuid4())
            self._category_ids.append(category_id)

            category = {
                "id": category_id,
                "name": name,
                "slug": f"category-{i + 1}",
                "parent_id": None,
                "sort_order": i,
                "status": "active",
                "created_at": self._random_date(-365, -30).isoformat(),
            }

            if quality == DataQuality.REALISTIC:
                category.update({
                    "description": self.fake.sentence(),
                    "icon": random.choice(["📱", "👕", "🏠", "🍜", "⚽", "📚", "👶", "💄", "🚗", "💊",
                                         "💻", "📊", "📈", "📝", "💡", "📰", "🎉", "👤", "❓", "📖"]),
                    "image_url": f"https://picsum.photos/200/200?random={random.randint(1, 1000)}",
                    "item_count": random.randint(0, 500),
                })

            categories.append(category)

        return categories

    def _generate_addresses(
        self, count: int, quality: DataQuality
    ) -> List[Dict[str, Any]]:
        """生成地址数据"""
        addresses = []

        for i in range(count):
            address_id = str(uuid.uuid4())

            address = {
                "id": address_id,
                "user_id": random.choice(self._user_ids) if self._user_ids else str(uuid.uuid4()),
                "name": self.fake.name(),
                "phone": self._generate_chinese_phone(),
                "province": self.fake.province(),
                "city": self.fake.city_name(),
                "district": self.fake.district(),
                "street": self.fake.street_address(),
                "postal_code": self.fake.postcode(),
                "is_default": i == 0,
                "created_at": self._random_date(-365, 0).isoformat(),
            }

            if quality == DataQuality.REALISTIC:
                address.update({
                    "label": random.choice(["家", "公司", "学校", ""]),
                    "building": f"{random.randint(1, 30)}号楼" if random.random() > 0.5 else None,
                    "room": f"{random.randint(1, 20)}0{random.randint(1, 9)}室" if random.random() > 0.5 else None,
                })

            addresses.append(address)

        return addresses

    def _generate_companies(
        self, count: int, quality: DataQuality
    ) -> List[Dict[str, Any]]:
        """生成公司数据"""
        companies = []
        industries = ["互联网", "金融", "教育", "医疗", "制造", "零售", "房地产", "物流", "餐饮", "文化传媒"]
        sizes = ["1-10人", "11-50人", "51-200人", "201-500人", "500人以上"]

        for i in range(count):
            company_id = str(uuid.uuid4())
            self._company_ids.append(company_id)

            company = {
                "id": company_id,
                "name": self.fake.company(),
                "industry": random.choice(industries),
                "size": random.choice(sizes),
                "phone": self._generate_chinese_phone(),
                "email": self.fake_en.company_email(),
                "created_at": self._random_date(-365, 0).isoformat(),
            }

            if quality == DataQuality.REALISTIC:
                company.update({
                    "description": self.fake.catch_phrase(),
                    "website": self.fake_en.url() if random.random() > 0.3 else None,
                    "address": {
                        "province": self.fake.province(),
                        "city": self.fake.city_name(),
                        "district": self.fake.district(),
                        "street": self.fake.street_address(),
                    },
                    "contact_person": self.fake.name(),
                    "contact_title": self.fake.job(),
                    "employee_count": random.randint(1, 10000),
                    "annual_revenue": f"{random.randint(100, 10000)}万" if random.random() > 0.5 else None,
                    "tags": random.sample(["潜力客户", "重点客户", "战略客户", "普通客户"], k=random.randint(0, 2)),
                })

            companies.append(company)

        return companies

    def _generate_transactions(
        self, count: int, quality: DataQuality
    ) -> List[Dict[str, Any]]:
        """生成交易数据"""
        transactions = []
        types = ["income", "expense", "transfer", "refund"]
        categories = ["销售收入", "服务费", "广告费", "人工成本", "办公费用", "运营费用", "其他"]
        statuses = ["pending", "completed", "failed", "cancelled"]

        for i in range(count):
            transaction_id = str(uuid.uuid4())
            trans_type = random.choice(types)

            amount = round(random.uniform(10, 100000), 2)
            if trans_type in ["expense", "refund"]:
                amount = -amount

            transaction = {
                "id": transaction_id,
                "transaction_number": f"TXN{datetime.now().strftime('%Y%m%d')}{random.randint(100000, 999999)}",
                "type": trans_type,
                "amount": amount,
                "currency": "CNY",
                "status": random.choices(statuses, weights=[0.1, 0.8, 0.05, 0.05])[0],
                "category": random.choice(categories),
                "created_at": self._random_date(-90, 0).isoformat(),
            }

            if quality == DataQuality.REALISTIC:
                transaction.update({
                    "description": self.fake.sentence(),
                    "from_account": f"**** **** **** {random.randint(1000, 9999)}" if trans_type != "income" else None,
                    "to_account": f"**** **** **** {random.randint(1000, 9999)}" if trans_type != "expense" else None,
                    "reference_id": str(uuid.uuid4()) if random.random() > 0.5 else None,
                    "customer_id": random.choice(self._customer_ids) if self._customer_ids and random.random() > 0.5 else None,
                    "company_id": random.choice(self._company_ids) if self._company_ids and random.random() > 0.3 else None,
                    "processed_at": self._random_date(-89, 0).isoformat() if transaction["status"] == "completed" else None,
                    "fee": round(abs(amount) * 0.006, 2) if random.random() > 0.7 else 0,
                    "notes": self.fake.sentence() if random.random() > 0.9 else None,
                })

            transactions.append(transaction)

        return transactions

    # ========== 辅助方法 ==========

    def _generate_chinese_phone(self) -> str:
        """生成中国手机号"""
        prefixes = ["130", "131", "132", "133", "134", "135", "136", "137", "138", "139",
                   "150", "151", "152", "153", "155", "156", "157", "158", "159",
                   "180", "181", "182", "183", "184", "185", "186", "187", "188", "189"]
        return random.choice(prefixes) + "".join([str(random.randint(0, 9)) for _ in range(8)])

    def _random_date(self, days_ago_start: int, days_ago_end: int) -> datetime:
        """生成随机日期"""
        start = datetime.now() + timedelta(days=days_ago_start)
        end = datetime.now() + timedelta(days=days_ago_end)
        delta = end - start
        random_days = random.randint(0, delta.days)
        return start + timedelta(days=random_days)

    def _sort_by_dependency(self, data_types: List[DataType]) -> List[DataType]:
        """按依赖顺序排序数据类型"""
        # 定义依赖关系（先生成的在前）
        order = [
            DataType.CATEGORY,
            DataType.USER,
            DataType.COMPANY,
            DataType.CUSTOMER,
            DataType.ADDRESS,
            DataType.PRODUCT,
            DataType.ARTICLE,
            DataType.ORDER,
            DataType.COMMENT,
            DataType.TRANSACTION,
        ]

        sorted_types = []
        for t in order:
            if t in data_types:
                sorted_types.append(t)

        # 添加未在 order 中的类型
        for t in data_types:
            if t not in sorted_types:
                sorted_types.append(t)

        return sorted_types

    def export_to_json(self, result: GenerationResult, output_path: str) -> str:
        """导出为 JSON 文件"""
        data = {}
        for generated in result.data:
            data[generated.data_type.value] = generated.records

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return output_path

    def export_to_mongodb_script(self, result: GenerationResult, output_path: str) -> str:
        """导出为 MongoDB 插入脚本"""
        script_lines = ["// MongoDB 测试数据插入脚本", "// Generated by Thinkus Test Data Generator", ""]

        for generated in result.data:
            collection_name = generated.data_type.value + "s"  # 简单复数
            script_lines.append(f"// {collection_name}")
            script_lines.append(f"db.{collection_name}.insertMany({json.dumps(generated.records, ensure_ascii=False, indent=2)});")
            script_lines.append("")

        script = "\n".join(script_lines)

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(script)

        return output_path
