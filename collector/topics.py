"""General is topic 1; Telegram omits forum_topic for its messages and ordinary replies."""


def matches_topic(message, topic: str | None) -> bool:
    if topic is None:
        return True
    if topic != "general":
        raise ValueError("Only the General topic filter is supported")
    header = getattr(message, "reply_to", None)
    return not bool(getattr(header, "forum_topic", False))
