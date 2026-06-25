from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("consultants", "0003_consultantprofile_cv_profile_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="consultantprofile",
            name="social_links",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="URLs: linkedin, twitter, instagram, facebook, youtube, website.",
            ),
        ),
    ]
