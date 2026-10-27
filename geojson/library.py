"""
The instance-wide library of saved boundaries, kept as one JSON value in the plugin's global data store (plugins
cannot have models): {"next_id": n, "files": [{id, name, geojson, area, owner_id, created_at, updated_at}]}. Every
user sees and uses every file; who may change one is decided in api.py. Ids are never reused, dates are ISO strings.
"""
import zlib
from contextlib import contextmanager

from django.db import connection, transaction
from django.utils import timezone
from rest_framework.fields import DateTimeField

from app.plugins.data_store import GlobalDataStore

KEY = "library"
# Every change to the library holds this Postgres advisory lock until its transaction ends, so that two saves at
# once cannot drop one of the edits (the data store's read, change, write is not atomic on its own)
LOCK_ID = zlib.crc32(b"geojson::library")


class NotFound(KeyError):
    pass


class NameTaken(ValueError):
    pass


def store():
    return GlobalDataStore("geojson")


def load():
    return store().get_json(KEY, None) or {"next_id": 1, "files": []}


def now():
    return DateTimeField().to_representation(timezone.now())


@contextmanager
def changing():
    """The library to change in place, saved when the block ends without an error, under the lock"""
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", [LOCK_ID])
        library = load()
        yield library
        store().set_json(KEY, library)


def all_files():
    """Every file, most recently changed first"""
    return sorted(load()["files"], key=lambda f: f["updated_at"], reverse=True)


def find(library, pk):
    for f in library["files"]:
        if f["id"] == pk:
            return f
    raise NotFound(pk)


def get(pk):
    return find(load(), pk)


def check_name(library, name, except_id=None):
    """NameTaken when another file has this name, whatever the case (checked under the lock, so it holds)"""
    if any(f["name"].lower() == name.lower() and f["id"] != except_id for f in library["files"]):
        raise NameTaken(name)


def create(name, geojson, area, owner_id):
    with changing() as library:
        check_name(library, name)
        stamp = now()
        f = {"id": library["next_id"], "name": name, "geojson": geojson, "area": area, "owner_id": owner_id,
             "created_at": stamp, "updated_at": stamp}
        library["next_id"] += 1
        library["files"].append(f)
    return f


def update(pk, **changes):
    with changing() as library:
        f = find(library, pk)
        if "name" in changes:
            check_name(library, changes["name"], except_id=pk)
        f.update(changes, updated_at=now())
    return f


def delete(pk):
    with changing() as library:
        library["files"].remove(find(library, pk))
