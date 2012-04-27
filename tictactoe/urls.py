from django.conf.urls.defaults import *
from tictactoe.models import Game

info_dict = {
    'queryset': Game.objects.all(),
}

urlpatterns = patterns('',
    # (r'^$', 'django.views.generic.list_detail.object_list', info_dict),
    (r'^$', 'tictactoe.views.init'),
    (r'^start/$', 'tictactoe.views.start'),
    (r'^start_comp/$', 'tictactoe.views.start_comp'),
    (r'^play/(?P<game_id>\d+)/$', 'tictactoe.views.game'),
)
