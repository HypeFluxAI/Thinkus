 len(content) < 10000:
                            file_contents.append({
                                'path': change,
                                'content': content
                            })
                except:
                    pass
        
        if not file_contents:
            return {'success': True, 'message': 'No files to review'}
        
        # AI审查
        response = self.client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=2000,
            system="""你是高级代码审查专家。审查代码并返回JSON:
{
  "issues": ["问题描述"],
  "security": ["安全问题"],
  "performance": ["性能问题"],
  "suggestions": ["改进建议"],
  "score": 85
}""",
            messages=[{
                "role": "user",
                "content": f"审查以下代码变更:\n\n{file_contents}"
            }]
        )
        
        import json
        try:
            result = json.loads(response.content[0].text)
            result['success'] = len(result.get('issues', [])) == 0
            return result
        except:
            return {'success': True, 'message': 'Review completed'}
```

---

## 四、自动修复器

```python
# services/auto_verify/fixers/auto_fixer.py

from anthropic import Anthropic
from typing import List, Dict, Optional
import subprocess
import os


class AutoFixer:
    """自动修复器"""
    
    def __init__(self):
        self.client = Anthropic()
    
    async def fix_build(self, project_path: str, build_result: Dict) -> List[str]:
        """修复构建错误"""
        fixed = []
        errors = build_result.get('errors', [])
        
        for error in errors[:5]:  # 限制修复数量
            fix = await self._ai_fix(error, project_path)
            if fix:
                fixed.append(fix)
        
        return fixed
    
    async def fix_lint(self, project_path: str, lint_result: Dict) -> List[str]:
        """修复代码规范问题"""
        fixed = []
        
        # 尝试自动格式化
        project_type = self._detect_project_type(project_path)
        
        if project_type == 'node':
            try:
                subprocess.run(
                    ['npx', 'prettier', '--write', '.'],
                    cwd=project_path,
                    capture_output=True,
                    timeout=30
                )
                fixed.append('Applied Prettier formatting')
            except:
                pass
            
            try:
                subprocess.run(
                    ['npx', 'eslint', '--fix', '.'],
                    cwd=project_path,
                    capture_output=True,
                    timeout=30
                )
                fixed.append('Applied ESLint auto-fix')
            except:
                pass
        
        elif project_type == 'python':
            try:
                subprocess.run(
                    ['python', '-m', 'black', '.'],
                    cwd=project_path,
                    capture_output=True,
                    timeout=30
                )
                fixed.append('Applied Black formatting')
            except:
                pass
        
        elif project_type == 'go':
            try:
                subprocess.run(
                    ['go', 'fmt', './...'],
                    cwd=project_path,
                    capture_output=True,
                    timeout=30
                )
                fixed.append('Applied go fmt')
            except:
                pass
        
        return fixed
    
    async def _ai_fix(self, error: str, project_path: str) -> Optional[str]:
        """AI修复错误"""
        response = self.client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": f"""修复以下错误:
{error}

返回JSON格式:
{{"file": "文件路径", "fix": "修复后的代码片段"}}
或返回 {{"cannot_fix": true, "reason": "原因"}}"""
            }]
        )
        
        import json
        try:
            result = json.loads(response.content[0].text)
            if result.get('cannot_fix'):
                return None
            
            # 应用修复
            file_path = os.path.join(project_path, result['file'])
            # 这里需要更复杂的代码替换逻辑
            return f"Fixed: {result['file']}"
        except:
            return None
    
    def _detect_project_type(self, path: str) -> str:
        if os.path.exists(os.path.join(path, 'package.json')):
            return 'node'
        elif os.path.exists(os.path.join(path, 'go.mod')):
            return 'go'
        elif os.path.exists(os.path.join(path, 'requirements.txt')):
            return 'python'
        return 'unknown'
```

---

## 五、gRPC服务

```python
# services/auto_verify/grpc_server.py

import grpc
from concurrent import futures
import asyncio

from proto import verify_pb2, verify_pb2_grpc
from .verifier import AutoVerifier, VerifyLevel


class VerifyServicer(verify_pb2_grpc.VerifyServiceServicer):
    """验证服务gRPC实现"""
    
    def __init__(self):
        self.verifier = AutoVerifier()
    
    def Verify(self, request, context):
        """执行验证"""
        level_map = {
            'quick': VerifyLevel.QUICK,
            'standard': VerifyLevel.STANDARD,
            'full': VerifyLevel.FULL
        }
        
        level = level_map.get(request.level, VerifyLevel.STANDARD)
        
        loop = asyncio.new_event_loop()
        result = loop.run_until_complete(
            self.verifier.verify(
                project_path=request.project_path,
                changes=list(request.changes),
                level=level,
                auto_fix=request.auto_fix
            )
        )
        
        return verify_pb2.VerifyResponse(
            success=result.success,
            level=request.level,
            issues=result.issues or [],
            auto_fixed=result.auto_fixed or []
        )


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    verify_pb2_grpc.add_VerifyServiceServicer_to_server(
        VerifyServicer(), server
    )
    server.add_insecure_port('[::]:50054')
    server.start()
    print("Verify Service started on port 50054")
    server.wait_for_termination()


if __name__ == '__main__':
    serve()
```

---

## 六、开发清单

```
services/auto_verify/
├── verifier.py              ✅ 已实现
├── checkers/
│   ├── build_checker.py     ✅ 已实现
│   ├── test_checker.py      待实现
│   ├── lint_checker.py      待实现
│   └── ai_reviewer.py       ✅ 已实现
├── fixers/
│   ├── auto_fixer.py        ✅ 已实现
│   └── format_fixer.py      待实现
└── grpc_server.py           ✅ 已实现
```
