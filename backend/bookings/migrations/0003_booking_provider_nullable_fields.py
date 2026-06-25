# Make Booking.consultant nullable, Booking.slot nullable, add Booking.provider FK

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0002_booking_consultant_service_booking_marketplace_bid"),
        ("providers", "0002_provider_user"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="provider",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="bookings",
                to="providers.provider",
            ),
        ),
        migrations.AlterField(
            model_name="booking",
            name="consultant",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="bookings",
                to="consultants.consultantprofile",
            ),
        ),
        migrations.AlterField(
            model_name="booking",
            name="slot",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="booking",
                to="bookings.availabilityslot",
            ),
        ),
    ]
