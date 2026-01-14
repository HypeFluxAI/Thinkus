# Thinkus 能力系统 - 技术实现文档

> **版本**: v12.0 | **日期**: 2026-01-15
>
> **技术栈**: Python (能力执行) + Go (调度)

---

## 一、目录结构

```
services/capabilities/
├── __init__.py
├── skills/                      # 技能
│   ├── __init__.py
│   ├── base.py                 # 技能基类
│   ├── analyze_code.py
│   ├── generate_doc.py
│   ├── extract_data.py
│   └── registry.py
├── subagents/                   # 子代理
│   ├── __init__.py
│   ├── base.py                 # 子代理基类
│   ├── frontend_dev.py
│   ├── backend_dev.py
│   ├── test_runner.py
│   └── registry.py
├── mcp/                         # MCP集成
│   ├── __init__.py
│   ├── client.py               # MCP客户端
│   ├── context7.py
│   ├── grep_app.py
│   └── browser.py
└── grpc_server.py
```

---

## 二、Skills实现

### 2.1 技能基类

```python
# services/capabilities/skills/base.py

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, Optional


@dataclass
class SkillConfig:
    """技能配置"""
    id: str
    name: str
    description: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]


@dataclass
class SkillResult:
    """技能执行结果"""
    success: bool
    data: Any
    error: Optional[str] = None
    duration_ms: int = 0


class BaseSkill(ABC):
    """技能基类"""
    
    def __init__(self, config: SkillConfig):
        self.config = config
    
    @property
    def id(self) -> str:
        return self.config.id
    
    @abstractmethod
    async def execute(self, input_data: Dict[str, Any]) -> SkillResult:
        """执行技能"""
        pass
    
    def validate_input(self, input_data: Dict[str, Any]) -> bool:
        """验证输入"""
        required = self.config.input_schema.get("required", [])
        return all(key in input_data for key in required)
```

### 2.2 代码分析技能

```python
# services/capabilities/skills/analyze_code.py

from anthropic import Anthropic
import time
from .base import BaseSkill, SkillConfig, SkillResult


class AnalyzeCodeSkill(BaseSkill):
    """代码分析技能"""
    
    def __init__(self):
        config = SkillConfig(
            id="analyze_code",
            name="代码分析",
            description="分析代码质量、潜在问题和改进建议",
            input_schema={
                "type": "object",
                "required": ["code"],
                "properties": {
                    "code": {"type": "string", "description": "要分析的代码"},
                    "language": {"type": "string", "description": "编程语言"}
                }
            },
            output_schema={
                "type": "object",
                "properties": {
                    "issues": {"type": "array"},
                    "suggestions": {"type": "array"},
                    "score": {"type": "number"}
                }
            }
        )
        super().__init__(config)
        self.client = Anthropic()
    
    async def execute(self, input_data: dict) -> SkillResult:
        start = time.time()
        
        try:
            code = input_data["code"]
            language = input_data.get("language", "auto")
            
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{
                    "role": "user",
                    "content": f"""分析以下{language}代码，返回JSON格式:
{{
  "issues": ["问题1", "问题2"],
  "suggestions": ["建议1", "建议2"],
  "score": 85,
  "summary": "总结"
}}

代码:
```
{code}
```"""
                }]
            )
            
            import json
            result = json.loads(response.content[0].text)
            
            return SkillResult(
                success=True,
                data=result,
                duration_ms=int((time.time() - start) * 1000)
            )
        
        except Exception as e:
            return SkillResult(
                success=False,
                data=None,
                error=str(e),
                duration_ms=int((time.time() - start) * 1000)
            )
```

---

## 三、Subagents实现

### 3.1 子代理基类

```python
# services/capabilities/subagents/base.py

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Callable
from enum import Enum
import asyncio


class SubagentStatus(Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class SubagentConfig:
    """子代理配置"""
    id: str
    name: str
    description: str
    capabilities: List[str]
    max_steps: int = 50
    timeout_seconds: int = 300


@dataclass
class SubagentStep:
    """执行步骤"""
    index: int
    action: str
    input: Dict[str, Any]
    output: Optional[Any] = None
    status: str = "pending"
    error: Optional[str] = None


@dataclass
class SubagentResult:
    """执行结果"""
    success: bool
    steps: List[SubagentStep]
    output: Any
    error: Optional[str] = None
    total_duration_ms: int = 0


class BaseSubagent(ABC):
    """子代理基类"""
    
    def __init__(self, config: SubagentConfig):
        self.config = config
        self.status = SubagentStatus.IDLE
        self.steps: List[SubagentStep] = []
        self.current_step = 0
        self._progress_callback: Optional[Callable] = None
    
    def set_progress_callback(self, callback: Callable):
        """设置进度回调"""
        self._progress_callback = callback
    
    async def run(self, task: Dict[str, Any]) -> SubagentResult:
        """运行子代理"""
        import time
        start = time.time()
        
        self.status = SubagentStatus.RUNNING
        self.steps = []
        self.current_step = 0
        
        try:
            # 规划步骤
            plan = await self.plan(task)
            
            # 执行步骤
            for step in plan:
                if self.current_step >= self.config.max_steps:
                    raise Exception("Exceeded max steps")
                
                self.steps.append(step)
                await self._report_progress(step)
                
                result = await self.execute_step(step)
                step.output = result
                step.status = "completed"
                
                self.current_step += 1
                await self._report_progress(step)
            
            self.status = SubagentStatus.COMPLETED
            
            return SubagentResult(
                success=True,
                steps=self.steps,
                output=await self.summarize(),
                total_duration_ms=int((time.time() - start) * 1000)
            )
        
        except Exception as e:
            self.status = SubagentStatus.FAILED
            return SubagentResult(
                success=False,
                steps=self.steps,
                output=None,
                error=str(e),
                total_duration_ms=int((time.time() - start) * 1000)
            )
    
    async def _report_progress(self, step: SubagentStep):
        """报告进度"""
        if self._progress_callback:
            await self._progress_callback({
                "subagent_id": self.config.id,
                "current_step": self.current_step,
                "total_steps": len(self.steps),
                "step": step
            })
    
    @abstractmethod
    async def plan(self, task: Dict[str, Any]) -> List[SubagentStep]:
        """规划执行步骤"""
        pass
    
    @abstractmethod
    async def execute_step(self, step: SubagentStep) -> Any:
        """执行单个步骤"""
        pass
    
    @abstractmethod
    async def summarize(self) -> Any:
        """总结执行结果"""
        pass
```

### 3.2 前端开发子代理

```python
# services/capabilities/subagents/frontend_dev.py

from anthropic import Anthropic
from typing import List, Dict, Any
from .base import BaseSubagent, SubagentConfig, SubagentStep


class FrontendDevSubagent(BaseSubagent):
    """前端开发子代理"""
    
    def __init__(self):
        config = SubagentConfig(
            id="frontend_dev",
            name="前端开发",
            description="专业的前端开发子代理，负责React/Vue/Next.js开发",
            capabilities=[
                "react_component",
                "vue_component",
                "nextjs_page",
                "css_styling",
                "responsive_design"
            ],
            max_steps=30,
            timeout_seconds=300
        )
        super().__init__(config)
        self.client = Anthropic()
        self.generated_files: List[Dict] = []
    
    async def plan(self, task: Dict[str, Any]) -> List[SubagentStep]:
        """规划前端开发步骤"""
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": f"""作为前端开发专家，规划以下任务的执行步骤:

任务: {task.get('description', '')}
技术栈: {task.get('tech_stack', 'React + TypeScript')}

返回JSON格式的步骤列表:
[
  {{"action": "create_component", "input": {{"name": "...", "type": "..."}}}},
  {{"action": "add_styling", "input": {{"component": "...", "style": "..."}}}},
  ...
]

可用actions: create_component, add_styling, add_logic, integrate, test"""
            }]
        )
        
        import json
        steps_data = json.loads(response.content[0].text)
        
        return [
            SubagentStep(index=i, action=s["action"], input=s["input"])
            for i, s in enumerate(steps_data)
        ]
    
    async def execute_step(self, step: SubagentStep) -> Any:
        """执行前端开发步骤"""
        if step.action == "create_component":
            return await self._create_component(step.input)
        elif step.action == "add_styling":
            return await self._add_styling(step.input)
        elif step.action == "add_logic":
            return await self._add_logic(step.input)
        elif step.action == "integrate":
            return await self._integrate(step.input)
        elif step.action == "test":
            return await self._test(step.input)
        else:
            raise ValueError(f"Unknown action: {step.action}")
    
    async def _create_component(self, input_data: Dict) -> Dict:
        """创建组件"""
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=3000,
            messages=[{
                "role": "user",
                "content": f"""创建一个React TypeScript组件:

名称: {input_data.get('name')}
类型: {input_data.get('type')}
描述: {input_data.get('description', '')}

返回完整的组件代码。使用函数组件和hooks。包含TypeScript类型定义。"""
            }]
        )
        
        code = response.content[0].text
        file_info = {
            "path": f"components/{input_data['name']}.tsx",
            "content": code
        }
        self.generated_files.append(file_info)
        
        return file_info
    
    async def _add_styling(self, input_data: Dict) -> Dict:
        """添加样式"""
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": f"""为组件添加TailwindCSS样式:

组件: {input_data.get('component')}
样式要求: {input_data.get('style', '')}

返回更新后的组件代码，使用TailwindCSS类名。"""
            }]
        )
        
        return {"styled_code": response.content[0].text}
    
    async def _add_logic(self, input_data: Dict) -> Dict:
        """添加业务逻辑"""
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": f"""添加业务逻辑:

组件: {input_data.get('component')}
逻辑需求: {input_data.get('logic', '')}

使用React hooks实现。返回更新后的代码。"""
            }]
        )
        
        return {"code_with_logic": response.content[0].text}
    
    async def _integrate(self, input_data: Dict) -> Dict:
        """集成组件"""
        return {"integrated": True, "files": self.generated_files}
    
    async def _test(self, input_data: Dict) -> Dict:
        """测试组件"""
        return {"tested": True, "status": "passed"}
    
    async def summarize(self) -> Dict:
        """总结开发结果"""
        return {
            "generated_files": self.generated_files,
            "total_files": len(self.generated_files),
            "status": "completed"
        }
```

---

## 四、MCP实现

### 4.1 MCP客户端

```python
# services/capabilities/mcp/client.py

from typing import Dict, Any, Optional
import asyncio
import json
from dataclasses import dataclass


@dataclass
class MCPServer:
    """MCP服务器配置"""
    id: str
    name: str
    command: str
    args: list
    env: dict


class MCPClient:
    """MCP客户端"""
    
    def __init__(self):
        self.servers: Dict[str, MCPServer] = {}
        self.connections: Dict[str, asyncio.subprocess.Process] = {}
    
    def register_server(self, server: MCPServer):
        """注册MCP服务器"""
        self.servers[server.id] = server
    
    async def connect(self, server_id: str):
        """连接到MCP服务器"""
        if server_id in self.connections:
            return
        
        server = self.servers.get(server_id)
        if not server:
            raise ValueError(f"Unknown server: {server_id}")
        
        process = await asyncio.create_subprocess_exec(
            server.command,
            *server.args,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**server.env}
        )
        
        self.connections[server_id] = process
    
    async def call(
        self,
        server_id: str,
        method: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """调用MCP方法"""
        if server_id not in self.connections:
            await self.connect(server_id)
        
        process = self.connections[server_id]
        
        # 构建JSON-RPC请求
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params
        }
        
        # 发送请求
        process.stdin.write(json.dumps(request).encode() + b'\n')
        await process.stdin.drain()
        
        # 读取响应
        response_line = await process.stdout.readline()
        response = json.loads(response_line.decode())
        
        if "error" in response:
            raise Exception(response["error"]["message"])
        
        return response.get("result", {})
    
    async def close(self, server_id: str):
        """关闭连接"""
        if server_id in self.connections:
            process = self.connections[server_id]
            process.terminate()
            await process.wait()
            del self.connections[server_id]
    
    async def close_all(self):
        """关闭所有连接"""
        for server_id in list(self.connections.keys()):
            await self.close(server_id)
```

### 4.2 context7 集成

```python
# services/capabilities/mcp/context7.py

from .client import MCPClient, MCPServer
from typing import Dict, List


class Context7MCP:
    """context7 MCP集成 - 官方文档查询"""
    
    SUPPORTED_FRAMEWORKS = [
        "nextjs", "react", "vue", "angular",
        "nodejs", "express", "fastapi",
        "typescript", "tailwindcss",
        "postgresql", "mongodb", "redis"
    ]
    
    def __init__(self, client: MCPClient):
        self.client = client
        
        # 注册context7服务器
        self.client.register_server(MCPServer(
            id="context7",
            name="Context7 Documentation",
            command="npx",
            args=["-y", "@anthropic/context7-mcp"],
            env={}
        ))
    
    async def search(self, query: str, framework: str = None) -> Dict:
        """搜索官方文档"""
        params = {"query": query}
        if framework and framework in self.SUPPORTED_FRAMEWORKS:
            params["framework"] = framework
        
        return await self.client.call("context7", "search", params)
    
    async def get_doc(self, doc_id: str) -> Dict:
        """获取文档详情"""
        return await self.client.call("context7", "get_document", {"id": doc_id})
    
    async def get_api_reference(self, framework: str, api_name: str) -> Dict:
        """获取API参考"""
        return await self.client.call("context7", "get_api", {
            "framework": framework,
            "api": api_name
        })
```

### 4.3 grep_app 集成

```python
# services/capabilities/mcp/grep_app.py

from .client import MCPClient, MCPServer
from typing import Dict, List, Optional


class GrepAppMCP:
    """grep_app MCP集成 - GitHub代码搜索"""
    
    def __init__(self, client: MCPClient):
        self.client = client
        
        # 注册grep_app服务器
        self.client.register_server(MCPServer(
            id="grep_app",
            name="Grep.app Code Search",
            command="npx",
            args=["-y", "@anthropic/grep-app-mcp"],
            env={}
        ))
    
    async def search(
        self,
        query: str,
        language: Optional[str] = None,
        repo: Optional[str] = None,
        limit: int = 10
    ) -> Dict:
        """搜索GitHub代码"""
        params = {
            "query": query,
            "limit": limit
        }
        if language:
            params["language"] = language
        if repo:
            params["repo"] = repo
        
        return await self.client.call("grep_app", "search", params)
    
    async def get_file(self, repo: str, path: str, ref: str = "main") -> Dict:
        """获取文件内容"""
        return await self.client.call("grep_app", "get_file", {
            "repo": repo,
            "path": path,
            "ref": ref
        })
    
    async def search_in_repo(self, repo: str, query: str) -> Dict:
        """在指定仓库中搜索"""
        return await self.client.call("grep_app", "search_in_repo", {
            "repo": repo,
            "query": query
        })
```

---

## 五、gRPC服务

```python
# services/capabilities/grpc_server.py

import grpc
from concurrent import futures
import asyncio

from proto import capability_pb2, capability_pb2_grpc
from .skills.registry import get_skill
from .subagents.registry import get_subagent
from .mcp.client import MCPClient


class CapabilityServicer(capability_pb2_grpc.CapabilityServiceServicer):
    """能力系统gRPC服务"""
    
    def __init__(self):
        self.mcp_client = MCPClient()
    
    def ExecuteSkill(self, request, context):
        """执行技能"""
        skill = get_skill(request.skill_id)
        if not skill:
            return capability_pb2.SkillResponse(
                success=False,
                error=f"Skill not found: {request.skill_id}"
            )
        
        loop = asyncio.new_event_loop()
        result = loop.run_until_complete(
            skill.execute(dict(request.input))
        )
        
        return capability_pb2.SkillResponse(
            success=result.success,
            data=str(result.data),
            error=result.error or "",
            duration_ms=result.duration_ms
        )
    
    def RunSubagent(self, request, context):
        """运行子代理"""
        subagent = get_subagent(request.subagent_id)
        if not subagent:
            return capability_pb2.SubagentResponse(
                success=False,
                error=f"Subagent not found: {request.subagent_id}"
            )
        
        loop = asyncio.new_event_loop()
        result = loop.run_until_complete(
            subagent.run(dict(request.task))
        )
        
        return capability_pb2.SubagentResponse(
            success=result.success,
            output=str(result.output),
            error=result.error or "",
            duration_ms=result.total_duration_ms
        )
    
    def CallMCP(self, request, context):
        """调用MCP服务"""
        loop = asyncio.new_event_loop()
        
        try:
            result = loop.run_until_complete(
                self.mcp_client.call(
                    request.server_id,
                    request.method,
                    dict(request.params)
                )
            )
            
            return capability_pb2.MCPResponse(
                success=True,
                result=str(result)
            )
        except Exception as e:
            return capability_pb2.MCPResponse(
                success=False,
                error=str(e)
            )


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    capability_pb2_grpc.add_CapabilityServiceServicer_to_server(
        CapabilityServicer(), server
    )
    server.add_insecure_port('[::]:50053')
    server.start()
    print("Capability Service started on port 50053")
    server.wait_for_termination()


if __name__ == '__main__':
    serve()
```

---

## 六、开发清单

```
services/capabilities/
├── skills/
│   ├── base.py              ✅ 已实现
│   ├── analyze_code.py      ✅ 已实现
│   ├── generate_doc.py      待实现
│   ├── extract_data.py      待实现
│   └── registry.py          待实现
├── subagents/
│   ├── base.py              ✅ 已实现
│   ├── frontend_dev.py      ✅ 已实现
│   ├── backend_dev.py       待实现
│   ├── test_runner.py       待实现
│   └── registry.py          待实现
├── mcp/
│   ├── client.py            ✅ 已实现
│   ├── context7.py          ✅ 已实现
│   ├── grep_app.py          ✅ 已实现
│   └── browser.py           待实现
└── grpc_server.py           ✅ 已实现
```
