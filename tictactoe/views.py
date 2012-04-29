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
        g.last_move='O'
    else:
        g.piece2='X'
        g.last_move='X'
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
        g.last_move='O'
    else:
        g.piece2='X'
        g.last_move='X'
    g.save()
    return HttpResponseRedirect(reverse('tictactoe.views.game', args=(g.id,)))

def game(request, game_id):
    g = get_object_or_404(Game, pk=game_id)

    piece_turn = 'X' if g.last_move == 'O' else 'O'
    player_turn = g.player1 if g.piece2 == g.last_move else g.player2

    open_moves = g.get_open_moves()
    board = g.get_board()
    winner = g.get_winner()
    if winner == g.piece1:
         winner = g.player1
         g.winner = g.piece1
    elif winner == g.piece2:
         winner = g.player2
         g.winner = g.piece2
    g.save()

    context = { 'game_id': game_id,
                'board': board,
                'player1': g.player1,
                'piece1': g.piece1,
                'player2': g.player2,
                'piece2': g.piece2,
                'piece_turn': piece_turn,
                'player_turn': player_turn,
                'winner': winner,
                'open_moves': open_moves,
                'endofgame': False if winner == None else True
              }
    return render_to_response('tictactoe/game.html', context, context_instance=RequestContext(request))

def move(request, game_id):
    g = get_object_or_404(Game, pk=game_id)
    move = int(request.POST['move'])
    player = 'X' if g.last_move == 'O' else 'O'
    g.make_move(player, move)

    winner = g.get_winner()

    return HttpResponseRedirect(reverse('tictactoe.views.game', args=(g.id,)))
