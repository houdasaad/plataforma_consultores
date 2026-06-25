from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("consultants", "0002_consultantprofile_academic_titles_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="consultantprofile",
            name="cv_profile",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Structured CV: education[] and campaign_experience[].",
            ),
        ),
        migrations.AddField(
            model_name="consultantprofile",
            name="cv_publication_status",
            field=models.CharField(
                choices=[("draft", "Draft"), ("published", "Published")],
                db_index=True,
                default="draft",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="consultantprofile",
            name="cv_snapshot_code",
            field=models.CharField(
                blank=True,
                help_text="Code to reload saved CV profile into the form.",
                max_length=32,
            ),
        ),
    ]
