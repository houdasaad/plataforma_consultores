from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


def _send(subject: str, body_text: str, to_email: str, html: str | None = None) -> None:
    kwargs = {
        "subject": subject,
        "message": body_text,
        "from_email": settings.DEFAULT_FROM_EMAIL,
        "recipient_list": [to_email],
        "fail_silently": False,
    }
    if html:
        kwargs["html_message"] = html
    send_mail(**kwargs)


def send_verification_email(user, token_uuid) -> None:
    link = f"{settings.FRONTEND_URL}/verificar-email?token={token_uuid}"
    subject = "Verify your email"
    text = f"Hi {user.email},\n\nPlease verify your email by opening this link:\n{link}\n"
    html = f'<p>Hi {user.email},</p><p><a href="{link}">Verify your email</a></p>'
    _send(subject, text, user.email, html)


def send_password_reset_email(user) -> None:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f"{settings.FRONTEND_URL}/restablecer?uid={uid}&token={token}"
    subject = "Password reset"
    text = f"Hi {user.email},\n\nReset your password using this link:\n{link}\n"
    html = f'<p>Hi {user.email},</p><p><a href="{link}">Reset your password</a></p>'
    _send(subject, text, user.email, html)


def send_consultant_status_email(user, approved: bool, reason: str = "") -> None:
    subject = "Consultant profile update" if approved else "Consultant profile rejected"
    if approved:
        text = "Your consultant profile has been approved."
        html = "<p>Your consultant profile has been approved.</p>"
    else:
        text = f"Your consultant profile was rejected.\nReason: {reason}\n"
        html = f"<p>Your consultant profile was rejected.</p><p>Reason: {reason}</p>"
    _send(subject, text, user.email, html)


def send_booking_confirmed_email(booking) -> None:
    subject = "Booking confirmed"
    link = booking.meeting_url or "(not set)"
    text = (
        f"Your booking with {booking.consultant.display_name} is confirmed.\n\nMeeting link: {link}\n"
    )
    html = (
        f"<p>Your booking with <strong>{booking.consultant.display_name}</strong> is confirmed.</p>"
        f'<p>Meeting link: <a href="{link}">{link}</a></p>'
    )
    _send(subject, text, booking.candidate.email, html)
