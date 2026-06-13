"""Single shared Redis client used as the session store."""

import redis

from app.config import settings

redis_client: redis.Redis = redis.Redis.from_url(
    settings.REDIS_URL,
    decode_responses=True,
    socket_connect_timeout=5,
    health_check_interval=30,
)