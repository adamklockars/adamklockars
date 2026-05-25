from annoying.decorators import render_to

@render_to('resume.html')
def home(request):
    return {}

@render_to('hero.html')
def bootstrap(request):
    return {}

@render_to('projects.html')
def projects(request):
    return {}

@render_to('blog.html')
def blog(request):
    return {}