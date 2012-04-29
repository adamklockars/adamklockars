celeryd: python manage.py celeryd -E -B --loglevel=INFO
web: python chide/manage.py collectstatic --noinput; bin/gunicorn_django --workers=4 --bind=0.0.0.0:$PORT chide/settings.py 
