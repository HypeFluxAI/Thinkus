"""
Thinkus Test Data Generator Service
使用 Faker 生成中文友好的测试数据
"""

from .models import *
from .generator import TestDataGenerator

__all__ = ["TestDataGenerator"]
