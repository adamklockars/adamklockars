# This also imports the include function
from django.conf.urls.defaults import *

urlpatterns = patterns('',
    url(r'^$', 'pinprint.views.login', name='login'),
    url(r'^account', 'pinprint.views.account', name='account'),
    url(r'^collage', 'pinprint.views.collage', name='collage')
)