"""
Thinkus Smoke Test Service
部署后自动化冒烟测试
"""

from .models import *
from .tester import SmokeTestRunner

__all__ = ["SmokeTestRunner"]
