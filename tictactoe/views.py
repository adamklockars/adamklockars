from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponseRedirect, HttpResponse
from django.core.urlresolvers import reverse
from django.template import RequestContext
from tictactoe.models import Game


def init(request):
    return render_to_response('tictactoe/init.html', context_instance=RequestContext(request))

def start(request):
    g = Game.objects.create()
    # g.address.add(request.META['HTTP_X_FORWARDED_FOR'] or request.META.get['REMOTE_ADDR'])
    g.player1=request.POST['player1']
    g.piece1=request.POST['piece1']
    g.player2=request.POST['player2']
    if request.POST['piece1'] == 'X':
        g.piece2='O'
    else:
        g.piece2='X'
    g.save()
    return HttpResponseRedirect(reverse('tictactoe.views.game', args=(g.id,)))

def start_comp(request):
    g = Game.objects.create()
    # g.address.add(request.META.get('HTTP_X_FORWARDED_FOR', '') or request.META.get('REMOTE_ADDR'))
    g.player1=request.POST['player1']
    g.piece1=request.POST['piece1']
    g.player2='Computer'
    if request.POST['piece1'] == 'X':
        g.piece2='O'
    else:
        g.piece2='X'
    g.save()
    return HttpResponseRedirect(reverse('tictactoe.views.game', args=(g.id,)))

def game(request, game_id):
    g = get_object_or_404(Game, pk=game_id)
    return render_to_response('tictactoe/game.html', {'game': g}, context_instance=RequestContext(request))
