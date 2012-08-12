from annoying.decorators import render_to

@render_to('login.html')
def login(request):
    return {}

@render_to('account.html')
def account(request):
    return {}

@render_to('collage.html')
def collage(request):
    return {}