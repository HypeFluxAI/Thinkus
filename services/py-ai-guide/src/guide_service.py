"""AI 产品导游服务"""
import uuid
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
import anthropic
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis

from .config import get_settings
from .models import (
    GuideType, StepType, UserLevel,
    GuideStep, GuideSession, UserContext,
    StuckReport, GuideRequest, GuideResponse,
    StepActionRequest, AIResponse
)


# 预定义引导模板（按产品类型）
GUIDE_TEMPLATES: Dict[str, Dict[str, List[Dict[str, Any]]]] = {
    "web-app": {
        "first_time": [
            {
                "type": "welcome",
                "title": "欢迎来到您的新应用！",
                "content": "恭喜您！您的产品已经上线了。接下来我会一步一步教您怎么使用。别担心，超级简单的！"
            },
            {
                "type": "highlight",
                "title": "这是首页",
                "content": "这是您产品的首页，用户打开网址第一眼看到的就是这里。看起来是不是挺专业的？",
                "target_element": "body"
            },
            {
                "type": "click",
                "title": "进入管理后台",
                "content": "点击这里可以进入管理后台，在那里您可以管理您的数据、查看用户、修改设置等。",
                "target_element": "[data-guide='admin-link']",
                "action_hint": "点击"管理后台"按钮"
            },
            {
                "type": "input",
                "title": "登录管理后台",
                "content": "用我们给您的账号密码登录。如果忘记了，可以在交付邮件里找到。",
                "target_element": "[data-guide='login-form']",
                "action_hint": "输入用户名和密码，然后点击登录"
            },
            {
                "type": "explain",
                "title": "认识仪表盘",
                "content": "这是仪表盘，可以看到您产品的整体情况：有多少用户、今天有多少访问、最近有什么动态等。",
                "target_element": "[data-guide='dashboard']"
            },
            {
                "type": "celebration",
                "title": "太棒了！您已经入门了！",
                "content": "恭喜您完成了基础教程！现在您已经知道怎么登录和查看数据了。有任何问题随时问我！"
            }
        ]
    },
    "ecommerce": {
        "first_time": [
            {
                "type": "welcome",
                "title": "您的商城已上线！",
                "content": "恭喜！您的网上商城已经准备好了。我来教您怎么管理商品和订单。"
            },
            {
                "type": "highlight",
                "title": "商城首页",
                "content": "这是您商城的首页。客户会在这里浏览商品、搜索和下单。"
            },
            {
                "type": "click",
                "title": "进入商家后台",
                "content": "点击这里进入商家后台，您可以在这里上架商品、管理订单、设置促销等。",
                "action_hint": "点击右上角的"商家入口"或"管理后台""
            },
            {
                "type": "explain",
                "title": "添加第一个商品",
                "content": "在"商品管理"里，点击"添加商品"，填写商品名称、价格、库存，上传图片就可以了。"
            },
            {
                "type": "explain",
                "title": "处理订单",
                "content": "有人下单后，您会在"订单管理"看到。点进去可以查看详情、确认发货。"
            },
            {
                "type": "celebration",
                "title": "您已经是店主了！",
                "content": "太棒了！您已经学会了商城的基本操作。开始上架商品吧，祝生意兴隆！"
            }
        ]
    }
}

# 鼓励话语库
ENCOURAGEMENTS = [
    "您做得很棒！继续加油！",
    "就是这样！您学得很快！",
    "完美！这一步完成了！",
    "太厉害了！马上就学会了！",
    "进步神速！继续保持！",
    "您真的很有天赋！",
    "这一步完成得非常好！",
    "离成功越来越近了！"
]


class AIGuideService:
    """AI 产品导游服务"""

    def __init__(self):
        self.settings = get_settings()
        self.client = anthropic.AsyncAnthropic(api_key=self.settings.anthropic_api_key)
        self.mongo_client: Optional[AsyncIOMotorClient] = None
        self.redis_client: Optional[redis.Redis] = None
        self.db = None

    async def connect(self):
        """连接数据库"""
        self.mongo_client = AsyncIOMotorClient(self.settings.mongodb_uri)
        self.db = self.mongo_client[self.settings.mongodb_database]
        self.redis_client = redis.from_url(self.settings.redis_url)

    async def disconnect(self):
        """断开连接"""
        if self.mongo_client:
            self.mongo_client.close()
        if self.redis_client:
            await self.redis_client.close()

    async def start_guide(self, request: GuideRequest) -> GuideResponse:
        """开始引导会话"""
        # 获取用户和项目上下文
        context = await self._get_user_context(request.user_id, request.project_id)

        # 生成或获取引导步骤
        steps = await self._generate_guide_steps(context, request)

        # 创建会话
        session = GuideSession(
            id=str(uuid.uuid4()),
            user_id=request.user_id,
            project_id=request.project_id,
            guide_type=request.guide_type,
            user_level=context.user_level,
            steps=steps,
            metadata={
                "product_type": context.product_type,
                "product_name": context.product_name
            }
        )

        # 保存会话
        await self._save_session(session)

        return self._build_response(session)

    async def process_action(self, request: StepActionRequest) -> GuideResponse:
        """处理用户操作"""
        session = await self._get_session(request.session_id)
        if not session:
            raise ValueError(f"Session not found: {request.session_id}")

        if request.action == "next":
            session = await self._move_to_next_step(session)
        elif request.action == "back":
            session = await self._move_to_previous_step(session)
        elif request.action == "skip":
            session = await self._skip_step(session)
        elif request.action == "stuck":
            session = await self._handle_stuck(session, request)
        elif request.action == "complete":
            session = await self._complete_step(session)

        await self._save_session(session)
        return self._build_response(session)

    async def ask_ai(
        self,
        session_id: str,
        question: str,
        screenshot_url: Optional[str] = None
    ) -> AIResponse:
        """AI 回答用户问题"""
        session = await self._get_session(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")

        context = await self._get_user_context(session.user_id, session.project_id)
        current_step = session.steps[session.current_step_index]

        # 构建 AI 提示
        system_prompt = f"""你是一个友好的产品使用顾问，正在帮助一个零技术背景的用户学习使用他们的新产品。

用户信息：
- 产品名称：{context.product_name}
- 产品类型：{context.product_type}
- 当前学习步骤：{current_step.title}
- 用户水平：{context.user_level.value}

沟通原则：
1. 用最简单的大白话，绝对不用技术术语
2. 把用户当成完全不懂电脑的人
3. 每次只说一件事，不要信息过载
4. 多用比喻和生活例子
5. 永远保持耐心和鼓励
6. 如果用户卡住了，换一种更简单的方式解释

回复格式：
- 用简短的句子
- 必要时分步骤说明
- 加入适当的表情符号让内容更亲切
"""

        messages = [{"role": "user", "content": question}]

        # 如果有截图，可以用 Vision 分析（这里简化处理）
        if screenshot_url:
            messages[0]["content"] = f"[用户发送了截图: {screenshot_url}]\n\n{question}"

        response = await self.client.messages.create(
            model=self.settings.default_model,
            max_tokens=500,
            system=system_prompt,
            messages=messages
        )

        ai_message = response.content[0].text

        # 提取建议
        suggestions = await self._generate_suggestions(context, current_step, question)

        return AIResponse(
            message=ai_message,
            suggestions=suggestions,
            confidence=0.9
        )

    async def _generate_guide_steps(
        self,
        context: UserContext,
        request: GuideRequest
    ) -> List[GuideStep]:
        """生成引导步骤"""
        # 首先检查是否有预定义模板
        template_key = context.product_type.lower().replace(" ", "-")
        if template_key in GUIDE_TEMPLATES:
            guide_key = request.guide_type.value
            if guide_key in GUIDE_TEMPLATES[template_key]:
                return self._convert_template_to_steps(
                    GUIDE_TEMPLATES[template_key][guide_key],
                    context
                )

        # 如果没有模板，使用 AI 生成
        return await self._ai_generate_steps(context, request)

    async def _ai_generate_steps(
        self,
        context: UserContext,
        request: GuideRequest
    ) -> List[GuideStep]:
        """AI 生成引导步骤"""
        system_prompt = """你是一个产品引导专家，需要为零技术背景的用户生成产品使用教程。

要求：
1. 每个步骤用最简单的大白话
2. 假设用户从来没用过电脑
3. 步骤要小，每步只做一件事
4. 多用鼓励和肯定的话
5. 生成 JSON 格式

输出格式（JSON数组）：
[
  {
    "type": "welcome|highlight|click|input|explain|video|quiz|celebration",
    "title": "简短标题（10字内）",
    "content": "详细说明（人话，50字内）",
    "target_element": "CSS选择器（可选）",
    "action_hint": "操作提示（可选）",
    "tips": ["小贴士1", "小贴士2"]
  }
]
"""

        user_prompt = f"""为以下产品生成{request.guide_type.value}引导：

产品名称：{context.product_name}
产品类型：{context.product_type}
主要功能：{', '.join(context.features[:5]) if context.features else '通用功能'}
用户水平：{context.user_level.value}

{"要引导的功能：" + request.target_feature if request.target_feature else ""}
{"用户问题：" + request.user_question if request.user_question else ""}

请生成 5-8 个引导步骤。
"""

        response = await self.client.messages.create(
            model="claude-3-sonnet-20240229",  # 用 Sonnet 生成内容
            max_tokens=2000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )

        # 解析响应
        try:
            content = response.content[0].text
            # 提取 JSON 部分
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]

            steps_data = json.loads(content)
            return self._convert_template_to_steps(steps_data, context)
        except Exception as e:
            # 回退到默认步骤
            return self._get_default_steps(context)

    def _convert_template_to_steps(
        self,
        template: List[Dict[str, Any]],
        context: UserContext
    ) -> List[GuideStep]:
        """转换模板为步骤"""
        steps = []
        for i, item in enumerate(template):
            step = GuideStep(
                id=str(uuid.uuid4()),
                order=i + 1,
                type=StepType(item.get("type", "explain")),
                title=item.get("title", f"步骤 {i + 1}"),
                content=item.get("content", ""),
                target_element=item.get("target_element"),
                action_hint=item.get("action_hint"),
                expected_action=item.get("expected_action"),
                fallback_content=item.get("fallback_content"),
                tips=item.get("tips", []),
                faq=item.get("faq", []),
                duration_seconds=item.get("duration_seconds", 30),
                can_skip=item.get("can_skip", True),
                auto_advance=item.get("auto_advance", False)
            )
            steps.append(step)
        return steps

    def _get_default_steps(self, context: UserContext) -> List[GuideStep]:
        """获取默认步骤"""
        return [
            GuideStep(
                id=str(uuid.uuid4()),
                order=1,
                type=StepType.WELCOME,
                title="欢迎！",
                content=f"欢迎使用 {context.product_name}！我来带您熟悉一下。",
                tips=["放轻松，我会一步一步教您"]
            ),
            GuideStep(
                id=str(uuid.uuid4()),
                order=2,
                type=StepType.EXPLAIN,
                title="开始探索",
                content="先随便点点看，熟悉一下界面。有任何问题随时问我！",
                tips=["不用担心点错，我们有撤销功能"]
            ),
            GuideStep(
                id=str(uuid.uuid4()),
                order=3,
                type=StepType.CELEBRATION,
                title="很棒！",
                content="您已经迈出了第一步！继续探索吧！",
            )
        ]

    async def _handle_stuck(
        self,
        session: GuideSession,
        request: StepActionRequest
    ) -> GuideSession:
        """处理用户卡住的情况"""
        current_step = session.steps[session.current_step_index]

        # 记录卡住点
        stuck_report = {
            "step_id": current_step.id,
            "step_title": current_step.title,
            "time": datetime.now().isoformat(),
            "user_input": request.user_input,
            "screenshot_url": request.screenshot_url
        }
        session.stuck_points.append(stuck_report)

        # 使用 AI 生成更简单的解释
        simpler_content = await self._get_simpler_explanation(session, current_step)

        # 更新当前步骤的内容为更简单的版本
        current_step.fallback_content = simpler_content
        session.steps[session.current_step_index] = current_step

        return session

    async def _get_simpler_explanation(
        self,
        session: GuideSession,
        step: GuideStep
    ) -> str:
        """获取更简单的解释"""
        prompt = f"""用户在学习 "{step.title}" 时卡住了。

原始说明：{step.content}
操作提示：{step.action_hint or '无'}

请用更简单的方式重新解释，假设用户：
1. 从没用过电脑
2. 不认识任何技术术语
3. 需要一步一步的详细指导

用最多3句话，每句不超过15个字。"""

        response = await self.client.messages.create(
            model=self.settings.default_model,
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )

        return response.content[0].text

    async def _generate_suggestions(
        self,
        context: UserContext,
        step: GuideStep,
        question: str
    ) -> List[str]:
        """生成建议"""
        # 基于当前步骤和用户问题生成建议
        default_suggestions = [
            "可以再解释一下吗？",
            "这个有什么用？",
            "我该怎么做？",
            "跳过这一步"
        ]

        # 可以用 AI 生成更相关的建议，但这里简化处理
        return default_suggestions[:3]

    async def _move_to_next_step(self, session: GuideSession) -> GuideSession:
        """移动到下一步"""
        current_step = session.steps[session.current_step_index]
        session.completed_steps.append(current_step.id)

        if session.current_step_index < len(session.steps) - 1:
            session.current_step_index += 1
        else:
            # 完成所有步骤
            session.completed_at = datetime.now()
            session.is_active = False

        session.progress_percent = (len(session.completed_steps) / len(session.steps)) * 100
        return session

    async def _move_to_previous_step(self, session: GuideSession) -> GuideSession:
        """移动到上一步"""
        if session.current_step_index > 0:
            session.current_step_index -= 1
        return session

    async def _skip_step(self, session: GuideSession) -> GuideSession:
        """跳过当前步骤"""
        current_step = session.steps[session.current_step_index]
        session.skipped_steps.append(current_step.id)
        return await self._move_to_next_step(session)

    async def _complete_step(self, session: GuideSession) -> GuideSession:
        """完成当前步骤"""
        return await self._move_to_next_step(session)

    def _build_response(self, session: GuideSession) -> GuideResponse:
        """构建响应"""
        current_step = session.steps[session.current_step_index]
        remaining_steps = len(session.steps) - session.current_step_index - 1
        estimated_time = sum(
            s.duration_seconds for s in session.steps[session.current_step_index:]
        )

        # 选择鼓励话语
        import random
        encouragement = random.choice(ENCOURAGEMENTS)

        return GuideResponse(
            session_id=session.id,
            current_step=current_step,
            total_steps=len(session.steps),
            progress_percent=session.progress_percent,
            estimated_time_remaining=estimated_time,
            can_go_back=session.current_step_index > 0,
            can_skip=current_step.can_skip,
            encouragement=encouragement
        )

    async def _get_user_context(self, user_id: str, project_id: str) -> UserContext:
        """获取用户上下文"""
        # 从数据库获取项目信息
        if self.db:
            project = await self.db.projects.find_one({"_id": project_id})
            if project:
                return UserContext(
                    user_id=user_id,
                    project_id=project_id,
                    product_type=project.get("productType", "web-app"),
                    product_name=project.get("name", "您的产品"),
                    product_url=project.get("productUrl", ""),
                    admin_url=project.get("adminUrl"),
                    features=project.get("features", []),
                    user_level=UserLevel.BEGINNER
                )

        # 默认上下文
        return UserContext(
            user_id=user_id,
            project_id=project_id,
            product_type="web-app",
            product_name="您的产品",
            product_url="",
            user_level=UserLevel.BEGINNER
        )

    async def _save_session(self, session: GuideSession):
        """保存会话"""
        if self.db:
            await self.db.guide_sessions.update_one(
                {"_id": session.id},
                {"$set": session.model_dump()},
                upsert=True
            )

        # 同时缓存到 Redis
        if self.redis_client:
            key = f"guide_session:{session.id}"
            await self.redis_client.setex(
                key,
                self.settings.session_timeout_minutes * 60,
                session.model_dump_json()
            )

    async def _get_session(self, session_id: str) -> Optional[GuideSession]:
        """获取会话"""
        # 先从 Redis 获取
        if self.redis_client:
            key = f"guide_session:{session_id}"
            data = await self.redis_client.get(key)
            if data:
                return GuideSession.model_validate_json(data)

        # 从 MongoDB 获取
        if self.db:
            doc = await self.db.guide_sessions.find_one({"_id": session_id})
            if doc:
                return GuideSession(**doc)

        return None


# 创建全局实例
ai_guide_service = AIGuideService()
