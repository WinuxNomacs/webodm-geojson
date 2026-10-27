from django.contrib.auth.models import User
from django.http import Http404
from rest_framework import permissions, serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from . import library
from .boundary import BoundaryError, normalize


def is_admin(user):
    return user.is_superuser or user.is_staff


def can_edit(user, boundary):
    """Only a file's owner and admins change or delete it; everyone else may use it or save a copy"""
    return is_admin(user) or (boundary["owner_id"] is not None and boundary["owner_id"] == user.id)


def name_taken_message(name):
    return "A file named \"%s\" is already in the library" % name


class BoundarySerializer(serializers.Serializer):
    """A file of the library (library.py) as the editor sends and receives it"""
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=255)
    geojson = serializers.JSONField()
    area = serializers.FloatField(read_only=True)
    owner = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    created_at = serializers.CharField(read_only=True)
    updated_at = serializers.CharField(read_only=True)

    def get_owner(self, obj):
        # None when the owner's account was deleted
        return self.context['usernames'].get(obj["owner_id"])

    def get_can_edit(self, obj):
        return can_edit(self.context['request'].user, obj)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Give the file a name")
        try:
            library.check_name(library.load(), value, except_id=self.instance["id"] if self.instance else None)
        except library.NameTaken:
            raise serializers.ValidationError(name_taken_message(value))
        return value

    def validate_geojson(self, value):
        try:
            geojson, area = normalize(value)
        except BoundaryError as e:
            raise serializers.ValidationError(str(e))
        self._area = area
        return geojson

    def validate(self, attrs):
        if hasattr(self, '_area'):
            attrs['area'] = self._area
        return attrs

    def create(self, validated_data):
        return library.create(owner_id=self.context['request'].user.id, **validated_data)

    def update(self, instance, validated_data):
        return library.update(instance["id"], **validated_data)


def serialize(request, files, many=False):
    """Files as JSON, with their owners' usernames looked up in one query"""
    ids = {f["owner_id"] for f in (files if many else [files])}
    usernames = dict(User.objects.filter(id__in=ids).values_list('id', 'username'))
    return BoundarySerializer(files, many=many, context={'request': request, 'usernames': usernames}).data


def save(serializer):
    """Saves, or a 400 like the serializer's when another save took the name in the meantime"""
    try:
        return serializer.save()
    except library.NameTaken as e:
        raise serializers.ValidationError({'name': [name_taken_message(e.args[0])]})


class BoundaryListCreateView(APIView):
    """GET: every saved file of the instance, most recently changed first. POST: save a new one, owned by this user."""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        return Response(serialize(request, library.all_files(), many=True))

    def post(self, request):
        serializer = BoundarySerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return Response(serialize(request, save(serializer)), status=status.HTTP_201_CREATED)


class BoundaryDetailView(APIView):
    """GET a file (anyone); PATCH/PUT/DELETE it (its owner or an admin, else 403)"""
    permission_classes = (permissions.IsAuthenticated,)

    def get_file(self, pk, editing=False):
        try:
            boundary = library.get(int(pk))
        except library.NotFound:
            raise Http404
        if editing and not can_edit(self.request.user, boundary):
            raise PermissionDenied("Only the file's owner or an admin can change it: save a copy instead")
        return boundary

    def get(self, request, pk):
        return Response(serialize(request, self.get_file(pk)))

    def put(self, request, pk, partial=False):
        serializer = BoundarySerializer(self.get_file(pk, editing=True), data=request.data, partial=partial,
                                        context={'request': request})
        serializer.is_valid(raise_exception=True)
        try:
            boundary = save(serializer)
        except library.NotFound:
            raise Http404
        return Response(serialize(request, boundary))

    def patch(self, request, pk):
        return self.put(request, pk, partial=True)

    def delete(self, request, pk):
        self.get_file(pk, editing=True)
        try:
            library.delete(int(pk))
        except library.NotFound:
            raise Http404
        return Response(status=status.HTTP_204_NO_CONTENT)
