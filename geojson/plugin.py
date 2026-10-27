from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.utils.translation import gettext_lazy as _

from app.models import Basemap
from app.plugins import PluginBase, Menu, MountPoint

from .api import BoundaryDetailView, BoundaryListCreateView


class Plugin(PluginBase):
    def main_menu(self):
        return [Menu(_("GeoJSON"), self.public_url(""), "fa fa-draw-polygon fa-fw")]

    def api_mount_points(self):
        return [
            MountPoint('boundaries$', BoundaryListCreateView.as_view()),
            MountPoint(r'boundaries/(?P<pk>[0-9]+)$', BoundaryDetailView.as_view()),
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
