from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect, HttpResponse
from django.core.urlresolvers import reverse
from django.template import RequestContext
from tictactoe.models import Game


def init(request):
    return render_to_response('tictactoe/init.html')

def start(request):
    client_address = request.META['HTTP_X_FORWARDED_FOR']
    g = get_object_or_404(Game)
    selected_player = request.POST['player']
    if selected_player == 'computer':
        g.mode = 'computer'
        return HttpResponseRedirect(reverse('tictactoe.views.game'))
    elif selected_player == 'player':
        g.mode = 'human'
        return HttpResponseRedirect(reverse('tictactoe.views.game'))
    else:
        return render_to_response('tictactoe/init.html', {
            'error_message': "Player mode not selected.",
        }, context_instance=RequestContext(request))

def game(request):
    return render_to_response('tictactoe/game.html')
