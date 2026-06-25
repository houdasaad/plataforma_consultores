# Generated migration: add user FK to Provider

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('providers', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='provider',
            name='user',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='provider_profile',
                to=settings.AUTH_USER_MODEL,
                help_text='Optional link to a platform user account for provider portal access.',
            ),
        ),
    ]
