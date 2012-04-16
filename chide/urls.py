# This also imports the include function
from django.conf.urls.defaults import *

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    url(r'^$', 'chide.views.home', name='home'),
    (r'^polls/', include('polls.urls')),
    (r'^admin/', include(admin.site.urls)),
)
