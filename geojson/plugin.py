from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.utils.translation import gettext_lazy as _

from app.models import Basemap
from app.plugins import PluginBase, Menu, MountPoint

from .api import BasemapsView, BoundaryDetailView, BoundaryListCreateView


class Plugin(PluginBase):
    def main_menu(self):
        return [Menu(_("GeoJSON"), self.public_url(""), "fa fa-draw-polygon fa-fw")]

    # The Create GeoJSON and Use existing buttons beside a task's boundary option, on every page with a task form
    # (shown only on a WebODM with the Task Options hook)
    def include_js_files(self):
        return ['boundary_buttons.js']

    def include_css_files(self):
        return ['geojson.css']

    def api_mount_points(self):
        return [
            MountPoint('boundaries$', BoundaryListCreateView.as_view()),
            MountPoint(r'boundaries/(?P<pk>[0-9]+)$', BoundaryDetailView.as_view()),
            MountPoint('basemaps$', BasemapsView.as_view()),
        ]

    def app_mount_points(self):
        @login_required
        def editor(request):
            return render(request, self.template_path("editor.html"), {
                'title': _("GeoJSON"),
                'public': self.public_url(""),
                'api': "/api/plugins/{}/".format(self.get_name()),
                # the same layers as the map of the tasks: Administration > Basemaps
                'basemaps': Basemap.get_cached_basemaps(),
            })

        return [MountPoint('$', editor)]
