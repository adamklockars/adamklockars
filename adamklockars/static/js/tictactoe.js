/* Main Game Handling class */
var TicTacToe = {
    last_turn: "{{object.last_turn}}",  // Keeps a record of who's turn it is
    board: "{{object.board}}",  // Keeps a record of the TicTacToe Board
    win: "{{object.get_winner()}}", // records who won if the game is over
    
    startGame: function() {
      // Draw the board
      var board_table = '<table class="board" border="0px" cellpadding="0px" cellspacing="0px" align="center"><tr><td id="ttt0">&nbsp;</td><td id="ttt1">&nbsp;</td><td id="ttt2">&nbsp;</td></tr><tr><td id="ttt3">&nbsp;</td><td id="ttt4">&nbsp;</td><td id="ttt5">&nbsp;</td></tr><tr><td id="ttt6">&nbsp;</td><td id="ttt7">&nbsp;</td><td id="ttt8">&nbsp;</td></tr></table>';
      $("#board").html(board_table);
      $("#menu").hide();
      
      // Add on-click events to each of the boxes of the board
      $("#board td").click(function(e) {
          TicTacToe.move( e.target.id );
         });

    },

    /* Handles clicks spaces on the board */
    move: function(id) {
      var space = $("#" + id);  // Board space table element
      var num = id.replace("ttt", ""); // # representing the space on the board
    
      if ({{object.get_valid_moves.indexOf(num)}} != -1 && {{object.winner}} == '') {
        space.html( this.turn );
        {{object.make_move(this.turn, num)}}
        this.nextTurn();  // End turn
      } 
    },

    nextTurn: function() {
      this.turn = (this.turn == "O") ? "X" : "O";
      if ({{object.get_winner}} == None) {
          this.turn = ({{object.last_move}} == "O") ? "X" : "O";
      } else {
          this.endGame(); 
      }
    },

    endGame: function() {
    
      $("#menu").html({{object.winner}} + " wins!");
      $("#menu").append("<a class="btn" href="http://www.adamklockars.com/tictactoe">Play Again</a>");
      
      // Button for playing again.
      $("#play_again").click(function () { TicTacToe.restartGame();  });
      $("#menu").show();
    
    },

  }
};

$(document).ready(function() {
    
    TicTacToe.startGame();
});
