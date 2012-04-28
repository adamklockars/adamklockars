from django.db import models
import pickle

class Game(models.Model):
    player1 = models.CharField(max_length=15)
    piece1 = models.CharField(max_length=1)
    player2 = models.CharField(max_length=15)
    piece2 = models.CharField(max_length=1)
    winner = models.CharField(max_length=1)
    # address = models.IPAddressField()
    board = models.CharField(max_length=100, default=pickle.dumps([''] * 9))
    last_move = models.CharField(max_length=1)

    def __unicode__(self):
       board = self.get_board()
       return '%s vs %s (%s)' % (self.player1, self.player2, board)

    def get_board(self):
        return pickle.loads(str(self.board))

    def make_move(self, player, move):
        board = self.get_board()
        board[move] = player
        self.board = pickle.dumps(board)
        self.last_move = player
        self.save()

    def get_valid_moves(self):
        board = self.get_board()
        return [position for position in range(9) if board[position] == '']

    def all_equal(self, list):
            return not list or list == [list[0]] * len(list)

    def get_winner(self):
        board = self.get_board()
        winning_sets = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]]
        for set in winning_sets:
            if board[set[0]] != '' and self.all_equal([board[i] for i in set]):
                return board[set[0]]

        if not self.get_valid_moves():
            return ''

        return None