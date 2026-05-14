from django.contrib import admin

from bookings.models import AvailabilitySlot, Booking


@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ("consultant", "start_at", "end_at", "is_booked")
    list_filter = ("is_booked",)
    raw_id_fields = ("consultant",)


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("id", "candidate", "consultant", "status", "amount", "created_at")
    list_filter = ("status",)
    raw_id_fields = ("candidate", "consultant", "slot", "diagnostic_submission")
