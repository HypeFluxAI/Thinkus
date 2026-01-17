"""
AI Employees Module
18位AI高管团队
"""

from typing import List, Optional
from .base import BaseEmployee

# 核心管理层 (6位)
from .mike_pm import MikePM
from .david_tech import DavidTech
from .elena_ux import ElenaUX
from .marcus_cmo import MarcusCMO
from .sarah_cfo import SarahCFO
from .james_legal import JamesLegal

# 技术专家组 (6位)
from .frank_devops import FrankDevOps
from .grace_security import GraceSecurity
from .henry_mobile import HenryMobile
from .ivan_ai import IvanAI
from .jack_architect import JackArchitect
from .kevin_qa import KevinQA

# 业务专家组 (5位)
from .lisa_data import LisaData
from .nancy_sales import NancySales
from .oscar_bd import OscarBD
from .paul_pr import PaulPR
from .quinn_ops import QuinnOps

# 特殊角色 (1位)
from .librarian import Librarian


class EmployeeRegistry:
    """Registry for all AI employees"""

    _employees: dict[str, BaseEmployee] = {}
    _initialized: bool = False

    @classmethod
    def initialize(cls):
        """Initialize all employees"""
        if cls._initialized:
            return

        # Create employee instances - 18位AI高管
        employees = [
            # 核心管理层
            MikePM(),
            DavidTech(),
            ElenaUX(),
            MarcusCMO(),
            SarahCFO(),
            JamesLegal(),
            # 技术专家组
            FrankDevOps(),
            GraceSecurity(),
            HenryMobile(),
            IvanAI(),
            JackArchitect(),
            KevinQA(),
            # 业务专家组
            LisaData(),
            NancySales(),
            OscarBD(),
            PaulPR(),
            QuinnOps(),
            # 特殊角色
            Librarian(),
        ]

        for emp in employees:
            cls._employees[emp.id] = emp

        cls._initialized = True

    @classmethod
    def get(cls, employee_id: str) -> Optional[BaseEmployee]:
        """Get employee by ID"""
        if not cls._initialized:
            cls.initialize()
        return cls._employees.get(employee_id)

    @classmethod
    def list_all(cls, department: Optional[str] = None) -> List[BaseEmployee]:
        """List all employees, optionally filtered by department"""
        if not cls._initialized:
            cls.initialize()

        employees = list(cls._employees.values())
        if department:
            employees = [e for e in employees if e.department == department]
        return employees


def get_employee(employee_id: str) -> Optional[BaseEmployee]:
    """Get an employee by ID"""
    return EmployeeRegistry.get(employee_id)


def list_employees(department: Optional[str] = None) -> List[BaseEmployee]:
    """List all employees"""
    return EmployeeRegistry.list_all(department)


__all__ = [
    "BaseEmployee",
    # 核心管理层
    "MikePM",
    "DavidTech",
    "ElenaUX",
    "MarcusCMO",
    "SarahCFO",
    "JamesLegal",
    # 技术专家组
    "FrankDevOps",
    "GraceSecurity",
    "HenryMobile",
    "IvanAI",
    "JackArchitect",
    "KevinQA",
    # 业务专家组
    "LisaData",
    "NancySales",
    "OscarBD",
    "PaulPR",
    "QuinnOps",
    # 特殊角色
    "Librarian",
    # 工具函数
    "EmployeeRegistry",
    "get_employee",
    "list_employees",
]
