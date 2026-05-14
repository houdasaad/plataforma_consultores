from django.contrib import admin

from payments.models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "booking", "amount", "commission_amount", "status", "provider", "created_at")
    list_filter = ("status", "provider")
    raw_id_fields = ("booking",)
