from annoying.decorators import render_to

@render_to('pinprint/login.html')
def login(request):
    return {}

@render_to('pinprint/account.html')
def account(request):
    return {}

@render_to('pinprint/collage.html')
def collage(request):
    return {}