# This also imports the include function
from django.conf.urls.defaults import *

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    url(r'^$', 'adamklockars.views.home', name='home'),
    url(r'^bootstrap', 'adamklockars.views.bootstrap', name='bootstrap'),
    (r'^polls/', include('polls.urls')),
    (r'^admin/', include(admin.site.urls)),
    (r'^tictactoe/', include('tictactoe.urls')),
)
