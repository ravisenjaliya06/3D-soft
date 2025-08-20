# Python imports
from typing import Optional, Tuple, TypeVar

T = TypeVar("T")
E = TypeVar("E", bound=Exception)

Result = Tuple[Optional[T], Optional[E]]
