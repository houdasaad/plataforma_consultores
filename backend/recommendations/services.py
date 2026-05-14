from diagnostics.models import DiagnosticSubmission
from consultants.models import ConsultantProfile


def recommend_consultants_with_answers(answers: dict, limit: int = 12):
    """
    Rule-based scoring: boost consultants whose category slugs match the `focus` answer.
    """
    focus = answers.get("focus")
    region = answers.get("region")

    qs = (
        ConsultantProfile.objects.filter(approval_status=ConsultantProfile.ApprovalStatus.APPROVED)
        .prefetch_related("categories")
        .select_related("user")
    )

    scored = []
    for profile in qs:
        score = 1.0
        if focus:
            f = str(focus)
            if profile.categories.filter(slug=f).exists():
                score += 6.0
            elif profile.categories.filter(slug__icontains=f).exists():
                score += 2.0
        if region:
            r = str(region)
            if r and r.lower() in (profile.bio or "").lower():
                score += 1.0
            if r and r.lower() in (profile.headline or "").lower():
                score += 1.5
        scored.append((profile, score))

    scored.sort(key=lambda x: (-x[1], x[0].display_name))
    return [p for p, _ in scored[:limit]]


def recommend_consultants(submission: DiagnosticSubmission, limit: int = 12):
    return recommend_consultants_with_answers(submission.answers or {}, limit=limit)


def recommend_consultants_from_campaign_run(run, limit: int = 12):
    """Map campaign scope to template-like focus slugs used in seed categories."""
    scope_to_focus = {"national": "campaign", "regional": "coalition", "local": "media"}
    focus = scope_to_focus.get(run.scope, "campaign")
    region_bits = [run.country_code or "", (run.district or "").strip()]
    region = " ".join(b for b in region_bits if b).strip() or None
    return recommend_consultants_with_answers({"focus": focus, "region": region}, limit=limit)
