from annoying.decorators import render_to

@render_to('resume.html')
def home(request):
    return {}

@render_to('hero.html')
def bootstrap(request):
    return {}
