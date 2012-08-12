# This also imports the include function
from django.conf.urls.defaults import *

urlpatterns = patterns('',
    url(r'^$', 'adamklockars.views.login', name='login'),
    url(r'^account', 'adamklockars.views.account', name='account'),
    url(r'^collage', 'adamklockars.views.collage', name='collage')
)