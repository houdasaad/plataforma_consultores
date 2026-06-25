# Generated migration — extend Payment model with escrow/release fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='paid_at',
            field=models.DateTimeField(blank=True, help_text='When the payment was actually paid', null=True),
        ),
        migrations.AddField(
            model_name='payment',
            name='released_at',
            field=models.DateTimeField(blank=True, help_text='When funds were released to consultant/provider', null=True),
        ),
        migrations.AddField(
            model_name='payment',
            name='service_verified_at',
            field=models.DateTimeField(blank=True, help_text='When the service was verified as provided — triggers release to consultant/provider', null=True),
        ),
        migrations.AlterField(
            model_name='payment',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('succeeded', 'Succeeded'),
                    ('failed', 'Failed'),
                    ('held', 'Held (pending release)'),
                    ('released', 'Released to provider'),
                    ('refunded', 'Refunded'),
                ],
                db_index=True,
                default='pending',
                max_length=20,
            ),
        ),
    ]
