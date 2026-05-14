from rest_framework import generics, permissions

from catalog.models import Category
from catalog.serializers import CategorySerializer


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
