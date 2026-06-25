# Change MarketplaceBid FK from ConsultantProfile to Provider

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("candidates", "0003_followed_service_inquiries_reports"),
        ("providers", "0002_provider_user"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="marketplacebid",
            name="consultant",
        ),
        migrations.AddField(
            model_name="marketplacebid",
            name="provider",
            field=models.ForeignKey(
                default=1,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="marketplace_bids",
                to="providers.provider",
            ),
            preserve_default=False,
        ),
    ]
