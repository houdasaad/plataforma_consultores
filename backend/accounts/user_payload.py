from core.demo_access import demo_capabilities_for, is_universal_demo_user


def build_user_payload(user) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "is_email_verified": user.is_email_verified,
        "is_demo_universal": is_universal_demo_user(user),
        "demo_capabilities": demo_capabilities_for(user),
    }
