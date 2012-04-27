from tictactoe.models import Game
from django.contrib import admin

class TictactoeAdmin(admin.ModelAdmin):
    fieldsets = [
        ('Player1',            {'fields': ['player1']}),
        ('Piece1',             {'fields': ['piece1']}),
        ('Player2',            {'fields': ['player2']}),
        ('Piece2',             {'fields': ['piece2']}),
        ('Winnner',            {'fields': ['winner']}),
        # ('Address',            {'fields': ['address']}),
        ('Board',              {'fields': ['board'], 'classes': ['collapse']}),
        ('Last Move',          {'fields': ['last_move']}),
    ]
    list_display = ('player1', 'piece1', 'player2', 'piece2', 'winner')
    list_filter = ['player1']

admin.site.register(Game, TictactoeAdmin)


