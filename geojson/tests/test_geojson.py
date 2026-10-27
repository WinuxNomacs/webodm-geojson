"""
Tests of the GeoJSON plugin: the boundary checks (as ODM reads a task's `boundary`), the instance-wide library in
the plugin's data store, its API and permissions, and the editor page.
"""
import importlib
import json
import os
import threading

from django.contrib.auth.models import User
from django.db import connection
from django.test import Client, TransactionTestCase
from rest_framework import status

from app.plugins import enable_plugin, disable_plugin, get_plugin_by_name
from app.plugins.data_store import GlobalDataStore
from app.tests.classes import BootTestCase

API = "/api/plugins/geojson/"

boundary = importlib.import_module("coreplugins.geojson.boundary")
library = importlib.import_module("coreplugins.geojson.library")
BoundaryError, normalize = boundary.BoundaryError, boundary.normalize

# About 111 m by 111 m at the equator
SQUARE = [[0, 0], [0.001, 0], [0.001, 0.001], [0, 0.001], [0, 0]]


def polygon(ring=None):
    return {"type": "Polygon", "coordinates": [ring or SQUARE]}


def feature(geometry):
    return {"type": "Feature", "properties": {"name": "x"}, "geometry": geometry}


def collection(*features):
    return {"type": "FeatureCollection", "features": list(features)}


class TestBoundaryChecks(BootTestCase):
    def error(self, data):
        with self.assertRaises(BoundaryError) as cm:
            normalize(data)
        return str(cm.exception)

    def test_a_bare_polygon_a_feature_and_a_collection_of_one_give_the_same_stored_file(self):
        stored, area = normalize(polygon())
        self.assertEqual(stored, {"type": "FeatureCollection", "features": [
            {"type": "Feature", "properties": {}, "geometry": {"type": "Polygon", "coordinates": [SQUARE]}}]})
        self.assertEqual(normalize(feature(polygon()))[0], stored)
        self.assertEqual(normalize(collection(feature(polygon())))[0], stored)
        self.assertAlmostEqual(area, 12308, delta=50)

    def test_the_stored_file_is_what_odm_reads_one_feature_with_a_polygon(self):
        stored, _ = normalize(collection(feature(polygon())))
        self.assertEqual(len(stored["features"]), 1)
        self.assertEqual(stored["features"][0]["geometry"]["type"], "Polygon")

    def test_corners_are_rounded_to_9_decimals_closed_and_without_repeats_or_heights(self):
        ring = [[1.1234567891234, 2.5, 100], [1.2, 2.5, 100], [1.2, 2.5], [1.2, 2.6], [1.1234567891234, 2.6]]
        stored, _ = normalize(polygon(ring))
        self.assertEqual(stored["features"][0]["geometry"]["coordinates"],
                         [[[1.123456789, 2.5], [1.2, 2.5], [1.2, 2.6], [1.123456789, 2.6], [1.123456789, 2.5]]])

    def test_a_multipolygon_of_one_part_is_taken_as_its_polygon(self):
        self.assertEqual(normalize({"type": "MultiPolygon", "coordinates": [[SQUARE]]})[0], normalize(polygon())[0])

    def test_a_multipolygon_of_several_parts_is_refused(self):
        moved = [[x + 1, y] for x, y in SQUARE]
        self.assertIn("this MultiPolygon has 2 parts", self.error({"type": "MultiPolygon", "coordinates": [[SQUARE], [moved]]}))

    def test_several_features_are_refused_since_odm_takes_a_single_polygon(self):
        self.assertIn("this file has 2 features", self.error(collection(feature(polygon()), feature(polygon()))))
        self.assertIn("this file has 0 features", self.error(collection()))

    def test_lines_points_and_empty_geometries_are_refused(self):
        self.assertIn("not LineString", self.error({"type": "LineString", "coordinates": SQUARE}))
        self.assertIn("not Point", self.error(feature({"type": "Point", "coordinates": [0, 0]})))
        self.assertIn("not an empty geometry", self.error(feature(None)))
        self.assertIn("This is not GeoJSON", self.error([1, 2]))

    def test_holes_are_refused_since_odm_uses_only_the_outline(self):
        hole = [[0.0004, 0.0004], [0.0006, 0.0004], [0.0006, 0.0006], [0.0004, 0.0004]]
        self.assertIn("has holes", self.error({"type": "Polygon", "coordinates": [SQUARE, hole]}))

    def test_too_few_corners_corners_on_a_line_and_bad_corners_are_refused(self):
        self.assertIn("at least 3 different corners", self.error(polygon([[0, 0], [1, 1], [1, 1], [0, 0]])))
        self.assertIn("no area", self.error(polygon([[0, 0], [1, 1], [2, 2], [0, 0]])))
        self.assertIn("outside longitude", self.error(polygon([[0, 0], [181, 0], [1, 1], [0, 0]])))
        self.assertIn("not a [longitude, latitude] pair", self.error(polygon([[0, 0], ["a", 0], [1, 1], [0, 0]])))
        self.assertIn("no corners", self.error({"type": "Polygon", "coordinates": []}))

    def test_a_projected_crs_is_refused_and_wgs84_is_accepted(self):
        data = dict(collection(feature(polygon())), crs={"type": "name", "properties": {"name": "EPSG:32632"}})
        self.assertIn("not EPSG:32632", self.error(data))
        data["crs"]["properties"]["name"] = "urn:ogc:def:crs:OGC:1.3:CRS84"
        normalize(data)


class TestGeoJsonPlugin(BootTestCase):
    def setUp(self):
        super().setUp()
        disable_plugin("geojson")
        enable_plugin("geojson")
        self.client = self.login("testuser")
        self.mine = self.saved("Mine", "testuser")
        self.theirs = self.saved("Theirs", "testuser2")

    def tearDown(self):
        disable_plugin("geojson")

    def saved(self, name, username):
        return library.create(name, normalize(polygon())[0], 12308, User.objects.get(username=username).id)

    def stored(self, boundary):
        """The file as it is now in the library, or None once deleted"""
        try:
            return library.get(boundary["id"])
        except library.NotFound:
            return None

    def login(self, username):
        client = Client()
        client.login(username=username, password="test1234")
        return client

    def send(self, method, path, data=None, client=None):
        client = client or self.client
        if method == "get":
            return client.get(API + path)
        return getattr(client, method)(API + path, json.dumps(data), content_type="application/json")

    def test_the_plugin_is_enabled_and_has_a_menu_tab(self):
        plugin = get_plugin_by_name("geojson")
        self.assertIsNotNone(plugin)
        self.assertEqual([m.label for m in plugin.main_menu()], ["GeoJSON"])
        self.assertFalse(os.path.exists(plugin.get_path("disabled")))

    def test_the_editor_page_loads_with_the_basemaps_and_the_api(self):
        res = self.client.get("/plugins/geojson/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertContains(res, 'id="gj-editor"')
        self.assertContains(res, 'data-api="/api/plugins/geojson/"')
        self.assertContains(res, 'id="gj-basemaps"')
        self.assertContains(res, "geojson_editor.js")

    def test_logged_out_users_get_neither_the_page_nor_the_api(self):
        self.assertEqual(Client().get("/plugins/geojson/").status_code, status.HTTP_302_FOUND)
        self.assertEqual(Client().get(API + "boundaries").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Client().get(API + "boundaries/%d" % self.mine["id"]).status_code, status.HTTP_403_FORBIDDEN)

    def test_other_pages_get_only_the_menu_tab_not_the_task_buttons(self):
        res = self.client.get("/dashboard/")
        self.assertContains(res, 'href="/plugins/geojson/"')
        self.assertNotContains(res, "boundary_buttons.js")
        self.assertNotContains(res, "/plugins/geojson/geojson.css")

    def test_the_library_is_one_value_in_the_plugin_s_global_data_store(self):
        value = GlobalDataStore("geojson").get_json("library")
        self.assertEqual([f["name"] for f in value["files"]], ["Mine", "Theirs"])
        self.assertEqual(value["next_id"], 3)
        self.assertEqual(value["files"][1]["owner_id"], User.objects.get(username="testuser2").id)

    def test_everyone_sees_every_file_with_its_owner_and_whether_they_can_change_it(self):
        res = self.client.get(API + "boundaries")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        files = {f["name"]: f for f in res.json()}
        self.assertEqual(set(files), {"Mine", "Theirs"})
        self.assertEqual(files["Theirs"]["owner"], "testuser2")
        self.assertTrue(files["Mine"]["can_edit"])
        self.assertFalse(files["Theirs"]["can_edit"])
        self.assertEqual(self.client.get(API + "boundaries/%d" % self.theirs["id"]).json()["name"], "Theirs")

    def test_the_most_recently_changed_file_comes_first(self):
        self.assertEqual([f["name"] for f in self.client.get(API + "boundaries").json()], ["Theirs", "Mine"])
        self.send("patch", "boundaries/%d" % self.mine["id"], {"name": "Mine again"})
        self.assertEqual([f["name"] for f in self.client.get(API + "boundaries").json()], ["Mine again", "Theirs"])

    def test_a_file_that_is_not_in_the_library_is_not_found(self):
        self.assertEqual(self.client.get(API + "boundaries/99").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.send("patch", "boundaries/99", {"name": "x"}).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.send("delete", "boundaries/99").status_code, status.HTTP_404_NOT_FOUND)

    def test_saving_a_file_normalizes_it_computes_its_area_and_makes_this_user_its_owner(self):
        res = self.send("post", "boundaries", {"name": "  Field 1 ", "geojson": feature(polygon())})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.content)
        saved = library.get(res.json()["id"])
        self.assertEqual(saved["name"], "Field 1")
        self.assertEqual(saved["owner_id"], User.objects.get(username="testuser").id)
        self.assertEqual(saved["geojson"], normalize(polygon())[0])
        self.assertAlmostEqual(saved["area"], 12308, delta=50)
        self.assertAlmostEqual(res.json()["area"], saved["area"])
        self.assertEqual(res.json()["owner"], "testuser")
        self.assertEqual(res.json()["created_at"], res.json()["updated_at"])

    def test_the_owner_cannot_be_set_by_the_client(self):
        res = self.send("post", "boundaries", {"name": "Field", "geojson": polygon(), "owner": "testuser2",
                                               "owner_id": User.objects.get(username="testuser2").id})
        self.assertEqual(library.get(res.json()["id"])["owner_id"], User.objects.get(username="testuser").id)

    def test_a_file_that_odm_cannot_use_is_refused_with_the_reason(self):
        res = self.send("post", "boundaries", {"name": "Line", "geojson": {"type": "LineString", "coordinates": SQUARE}})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not LineString", res.json()["geojson"][0])
        self.assertNotIn("Line", [f["name"] for f in library.all_files()])

    def test_names_are_unique_across_the_instance_whatever_the_case(self):
        res = self.send("post", "boundaries", {"name": "theirs", "geojson": polygon()})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.json()["name"], ['A file named "theirs" is already in the library'])
        self.assertEqual(self.send("post", "boundaries", {"name": " ", "geojson": polygon()}).status_code, status.HTTP_400_BAD_REQUEST)
        res = self.send("patch", "boundaries/%d" % self.mine["id"], {"name": "THEIRS"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_the_library_itself_refuses_a_name_taken_since_the_request_was_checked(self):
        with self.assertRaises(library.NameTaken):
            library.create("THEIRS", normalize(polygon())[0], 12308, None)
        with self.assertRaises(library.NameTaken):
            library.update(self.mine["id"], name="theirs")

    def test_the_owner_renames_changes_and_deletes_their_file(self):
        moved = [[x + 1, y] for x, y in SQUARE]
        res = self.send("patch", "boundaries/%d" % self.mine["id"], {"name": "Mine renamed", "geojson": polygon(moved)})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.content)
        mine = self.stored(self.mine)
        self.assertEqual(mine["name"], "Mine renamed")
        self.assertEqual(mine["geojson"]["features"][0]["geometry"]["coordinates"][0][0], [1, 0])
        self.assertEqual(mine["created_at"], self.mine["created_at"])
        self.assertGreater(mine["updated_at"], self.mine["updated_at"])
        # keeping its own name is not a clash
        self.assertEqual(self.send("patch", "boundaries/%d" % self.mine["id"], {"name": "Mine renamed"}).status_code, status.HTTP_200_OK)
        self.assertEqual(self.send("delete", "boundaries/%d" % self.mine["id"]).status_code, status.HTTP_204_NO_CONTENT)
        self.assertIsNone(self.stored(self.mine))

    def test_ids_are_not_reused_after_a_delete(self):
        self.send("delete", "boundaries/%d" % self.theirs["id"], client=self.login("testsuperuser"))
        res = self.send("post", "boundaries", {"name": "New", "geojson": polygon()})
        self.assertEqual(res.json()["id"], 3)

    def test_others_cannot_change_or_delete_a_file_but_can_save_a_copy(self):
        res = self.send("patch", "boundaries/%d" % self.theirs["id"], {"name": "Taken"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("save a copy instead", res.json()["detail"])
        self.assertEqual(self.send("delete", "boundaries/%d" % self.theirs["id"]).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.stored(self.theirs)["name"], "Theirs")
        res = self.send("post", "boundaries", {"name": "Theirs (copy)", "geojson": self.theirs["geojson"]})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.json()["can_edit"])

    def test_an_admin_changes_and_deletes_anyone_s_file(self):
        admin = self.login("testsuperuser")
        files = self.send("get", "boundaries", client=admin).json()
        self.assertTrue(all(f["can_edit"] for f in files))
        self.assertEqual(self.send("patch", "boundaries/%d" % self.theirs["id"], {"name": "Checked"}, client=admin).status_code, status.HTTP_200_OK)
        self.assertEqual(self.send("delete", "boundaries/%d" % self.theirs["id"], client=admin).status_code, status.HTTP_204_NO_CONTENT)

    def test_a_file_stays_in_the_library_when_its_owner_is_deleted(self):
        leaving = User.objects.create_user(username="leaving", password="test1234")
        library.create("Left behind", self.theirs["geojson"], self.theirs["area"], leaving.id)
        leaving.delete()
        files = {f["name"]: f for f in self.client.get(API + "boundaries").json()}
        self.assertIsNone(files["Left behind"]["owner"])
        self.assertFalse(files["Left behind"]["can_edit"])
        admin_files = {f["name"]: f for f in self.send("get", "boundaries", client=self.login("testsuperuser")).json()}
        self.assertTrue(admin_files["Left behind"]["can_edit"])


class TestLibraryLock(TransactionTestCase):
    """Saves from two connections at once (a TransactionTestCase, so that each thread commits its own)"""

    def tearDown(self):
        GlobalDataStore("geojson").del_key("library")

    def test_two_saves_at_once_both_survive(self):
        names = ["Field %d" % i for i in range(8)]

        def save(name):
            try:
                library.create(name, normalize(polygon())[0], 12308, None)
            finally:
                connection.close()

        threads = [threading.Thread(target=save, args=(name,)) for name in names]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        files = library.all_files()
        self.assertEqual(sorted(f["name"] for f in files), names)
        self.assertEqual(sorted(f["id"] for f in files), list(range(1, 9)))
