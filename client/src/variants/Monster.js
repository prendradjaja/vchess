import { ChessRules } from "@/base_rules";
import { randInt } from "@/utils/alea";

export class MonsterRules extends ChessRules {

  static IsGoodFlags(flags) {
    // Only black can castle
    return !!flags.match(/^[a-z]{2,2}$/);
  }

  static GenRandInitFen(randomness) {
    if (randomness == 2) randomness--;
    const fen = ChessRules.GenRandInitFen(randomness);
    return (
      // 26 first chars are 6 rows + 6 slashes
      fen.substr(0, 26)
      // En passant available, and "half-castle"
      .concat("1PPPPPP1/4K3 w 0 ")
      .concat(fen.substr(-6, 2))
      .concat(" -")
    );
  }

  getFlagsFen() {
    return this.castleFlags['b'].map(V.CoordToColumn).join("");
  }

  setFlags(fenflags) {
    this.castleFlags = { 'b': [-1, -1] };
    for (let i = 0; i < 2; i++)
      this.castleFlags['b'][i] = V.ColumnToCoord(fenflags.charAt(i));
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    this.subTurn = 1;
  }

  getPotentialKingMoves([x, y]) {
    if (this.getColor(x, y) == 'b') return super.getPotentialKingMoves([x, y]);
    // White doesn't castle:
    return this.getSlideNJumpMoves(
      [x, y],
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
      "oneStep"
    );
  }

  isAttacked() {
    // Goal is king capture => no checks
    return false;
  }

  filterValid(moves) {
    return moves;
  }

  getCheckSquares() {
    return [];
  }

  getCurrentScore() {
    const color = this.turn;
    if (this.kingPos[color][0] < 0) return (color == 'w' ? "0-1" : "1-0");
    return "*";
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    if (this.turn == 'b' || this.subTurn == 2)
      this.epSquares.push(this.getEpSquare(move));
    else this.epSquares.push(null);
    V.PlayOnBoard(this.board, move);
    if (this.turn == 'w') {
      if (this.subTurn == 1) this.movesCount++;
      if (
        this.subTurn == 2 ||
        // King captured
        (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      ) {
        this.turn = 'b';
        this.subTurn = 1;
      }
      else this.subTurn = 2;
    }
    else {
      this.turn = 'w';
      this.movesCount++;
    }
    this.postPlay(move);
  }

  updateCastleFlags(move, piece) {
    // Only black can castle:
    const firstRank = 0;
    if (piece == V.KING && move.appear[0].c == 'b')
      this.castleFlags['b'] = [8, 8];
    else if (
      move.start.x == firstRank &&
      this.castleFlags['b'].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags['b'][0] ? 0 : 1);
      this.castleFlags['b'][flagIdx] = 8;
    }
    else if (
      move.end.x == firstRank &&
      this.castleFlags['b'].includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags['b'][0] ? 0 : 1);
      this.castleFlags['b'][flagIdx] = 8;
    }
  }

  postPlay(move) {
    // Definition of 'c' in base class doesn't work:
    const c = move.vanish[0].c;
    const piece = move.vanish[0].p;
    if (piece == V.KING)
      this.kingPos[c] = [move.appear[0].x, move.appear[0].y];
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING) {
      // Opponent's king is captured, game over
      this.kingPos[move.vanish[1].c] = [-1, -1];
      move.captureKing = true; //for undo
    }
    this.updateCastleFlags(move, piece);
  }

  undo(move) {
    this.epSquares.pop();
    this.disaggregateFlags(JSON.parse(move.flags));
    V.UndoOnBoard(this.board, move);
    if (this.turn == 'w') {
      if (this.subTurn == 2) this.subTurn = 1;
      else this.turn = 'b';
      this.movesCount--;
    }
    else {
      this.turn = 'w';
      this.subTurn = (!move.captureKing ? 2 : 1);
    }
    this.postUndo(move);
  }

  postUndo(move) {
    if (move.vanish.length == 2 && move.vanish[1].p == V.KING)
      // Opponent's king was captured
      this.kingPos[move.vanish[1].c] = [move.vanish[1].x, move.vanish[1].y];
    super.postUndo(move);
  }

  // Custom search at depth 1(+1)
  getComputerMove() {
    const getBestWhiteMove = (terminal) => {
      // Generate all sequences of 2-moves
      let moves1 = this.getAllValidMoves();
      moves1.forEach(m1 => {
        m1.eval = -V.INFINITY;
        m1.move2 = null;
        this.play(m1);
        if (!!terminal) m1.eval = this.evalPosition();
        else {
          const moves2 = this.getAllValidMoves();
          moves2.forEach(m2 => {
            this.play(m2);
            const eval2 = this.evalPosition() + 0.05 - Math.random() / 10;
            this.undo(m2);
            if (eval2 > m1.eval) {
              m1.eval = eval2;
              m1.move2 = m2;
            }
          });
        }
        this.undo(m1);
      });
      moves1.sort((a, b) => b.eval - a.eval);
      if (!!terminal)
        // The move itself doesn't matter, only its eval:
        return moves1[0];
      let candidates = [0];
      for (
        let i = 1;
        i < moves1.length && moves1[i].eval == moves1[0].eval;
        i++
      ) {
        candidates.push(i);
      }
      const idx = candidates[randInt(candidates.length)];
      const move2 = moves1[idx].move2;
      delete moves1[idx]["move2"];
      return [moves1[idx], move2];
    };

    const getBestBlackMove = () => {
      let moves = this.getAllValidMoves();
      moves.forEach(m => {
        m.eval = V.INFINITY;
        this.play(m);
        const evalM = getBestWhiteMove("terminal").eval
        this.undo(m);
        if (evalM < m.eval) m.eval = evalM;
      });
      moves.sort((a, b) => a.eval - b.eval);
      let candidates = [0];
      for (
        let i = 1;
        i < moves.length && moves[i].eval == moves[0].eval;
        i++
      ) {
        candidates.push(i);
      }
      const idx = candidates[randInt(candidates.length)];
      return moves[idx];
    };

    const color = this.turn;
    return (color == 'w' ? getBestWhiteMove() : getBestBlackMove());
  }

};
