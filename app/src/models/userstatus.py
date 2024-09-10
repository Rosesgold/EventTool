from enum import Enum


class AccountStatus(Enum):
    BASE = "base account"
    PRO = "pro account"
    CREATOR = "creator account"

# class UserAccountPrototype:
#     status: str
#
#
# class BaseAccount(UserAccountPrototype):
#     status: str = "base account"
#
#
# class ProAccount(UserAccountPrototype):
#     status: str = "pro account"
#
#
# class CreatorAccount(UserAccountPrototype):
#     status: str = "creator account"
