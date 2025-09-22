from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    debug: bool
    
    # URLs
    rust_url: str
    backend_url: str
    
    # CORS
    cors_origins: List[str]
    cors_methods: List[str]
    cors_headers: List[str]
    
    # Security - Centralized JWT constants
    jwt_secret: str
    jwt_algorithm: str
    jwt_expiration_minutes: int
    
    # Database
    database_url: str
    
    # Logging (must be set in .env)
    log_level: str
    
    # Default Agent Configuration
    default_agent_name: Optional[str] = None
    default_system_prompt: Optional[str] = None
    
    # Model Configuration
    model_max_tokens: Optional[int] = None
    model_temperature: Optional[float] = None
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"
    
    def _extract_port_from_url(self, url: str) -> int:
        # Find the last colon in the URL
        port_start = url.rfind(':')
        if port_start == -1:
            raise ValueError(f"No port found in URL: {url}")
        
        # Extract everything after the colon
        port_part = url[port_start + 1:]
        
        # Remove trailing slash if present
        if port_part.endswith('/'):
            port_part = port_part[:-1]
        
        try:
            return int(port_part)
        except ValueError:
            raise ValueError(f"Invalid port number in URL: {port_part}")


# Global settings instance
settings = Settings()

# Centralized JWT constants for easier maintenance
JWT_SECRET = settings.jwt_secret
JWT_ALGORITHM = settings.jwt_algorithm
JWT_EXPIRATION_MINUTES = settings.jwt_expiration_minutes 