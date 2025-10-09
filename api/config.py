"""
Configuration module for the Pareto API
"""

import os
from typing import Optional

class Settings:
    """Application settings and configuration"""

    def __init__(self):
        self.debug = os.getenv("DEBUG", "false").lower() == "true"
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.log_level = os.getenv("LOG_LEVEL", "INFO" if not self.debug else "DEBUG")

    def is_debug_mode(self) -> bool:
        """Check if debug mode is enabled"""
        return self.debug

    def get_log_prefix(self) -> str:
        """Get appropriate log prefix based on environment"""
        if self.debug:
            return "DEBUG"
        return "LOG"

# Global settings instance
settings = Settings()

def log(message: str, level: str = "info"):
    """UAT compliant logging function"""
    prefix = settings.get_log_prefix()

    if settings.is_debug_mode() or level.upper() == "ERROR":
        print(f"{prefix}: {message}")
    elif level.upper() == "INFO":
        # Only log info in production/UAT if it's business-critical
        if any(keyword in message.lower() for keyword in ["initialized", "loaded", "created", "updated", "deleted"]):
            print(f"{prefix}: {message}")