from django.urls import path

from bookings.views import (
    BookingCreateView,
    BookingListView,
    ConsultantSlotDestroyView,
    ConsultantSlotListCreateView,
    PublicSlotListView,
)

urlpatterns = [
    path("slots/", PublicSlotListView.as_view(), name="slot-public-list"),
    path("consultant/slots/", ConsultantSlotListCreateView.as_view(), name="consultant-slot-list"),
    path(
        "consultant/slots/<int:pk>/",
        ConsultantSlotDestroyView.as_view(),
        name="consultant-slot-destroy",
    ),
    path("", BookingListView.as_view(), name="booking-list"),
    path("create/", BookingCreateView.as_view(), name="booking-create"),
]
