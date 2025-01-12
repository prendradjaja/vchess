import { ChessRules, PiPo } from "@/base_rules";

export class Atomic1Rules extends ChessRules {

  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);

    if (this.getPiece(x, y) == V.PAWN) {
      // Promotions by captures can be reduced to only one deterministic
      // move (because of the explosion).
      moves = moves.filter(m => {
        return (
          m.vanish.length == 1 ||
          [V.PAWN, V.QUEEN].includes(m.appear[0].p)
        );
      });
    }

    // Handle explosions
    moves.forEach(m => {
      // NOTE: if vanish.length==2 and appear.length==2, this is castle
      if (m.vanish.length > 1 && m.appear.length <= 1) {
        // Explosion! (TODO?: drop moves which explode our king here)
        let steps = [
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
          [1, 1]
        ];
        for (let step of steps) {
          let x = m.end.x + step[0];
          let y = m.end.y + step[1];
          if (
            V.OnBoard(x, y) &&
            this.board[x][y] != V.EMPTY &&
            this.getPiece(x, y) != V.PAWN
          ) {
            m.vanish.push(
              new PiPo({
                p: this.getPiece(x, y),
                c: this.getColor(x, y),
                x: x,
                y: y
              })
            );
          }
        }
        m.end = { x: m.appear[0].x, y: m.appear[0].y };
        m.appear.pop(); //Nothin appears in this case
      }
    });

    return moves;
  }

  getPotentialKingMoves([x, y]) {
    // King cannot capture:
    let moves = [];
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    for (let step of steps) {
      const i = x + step[0];
      const j = y + step[1];
      if (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY)
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves.concat(this.getCastleMoves([x, y]));
  }

  isAttacked(sq, color) {
    if (
      this.getPiece(sq[0], sq[1]) == V.KING &&
      this.isAttackedByKing(sq, color)
    ) {
      // A king next to the enemy king is immune to attacks
      return false;
    }
    return (
      this.isAttackedByPawn(sq, color) ||
      this.isAttackedByRook(sq, color) ||
      this.isAttackedByKnight(sq, color) ||
      this.isAttackedByBishop(sq, color) ||
      this.isAttackedByQueen(sq, color)
      // No "attackedByKing": it cannot take
    );
  }

  postPlay(move) {
    super.postPlay(move);
    // NOTE: (harmless) condition on movesCount for Atomic2
    if (move.appear.length == 0 && this.movesCount >= 2) {
      // Capture
      const firstRank = { w: 7, b: 0 };
      for (let c of ["w", "b"]) {
        // Did we explode king of color c ? (TODO: remove move earlier)
        if (
          Math.abs(this.kingPos[c][0] - move.end.x) <= 1 &&
          Math.abs(this.kingPos[c][1] - move.end.y) <= 1
        ) {
          this.kingPos[c] = [-1, -1];
          this.castleFlags[c] = [8, 8];
        }
        else {
          // Now check if init rook(s) exploded
          if (Math.abs(move.end.x - firstRank[c]) <= 1) {
            if (Math.abs(move.end.y - this.castleFlags[c][0]) <= 1)
              this.castleFlags[c][0] = 8;
            if (Math.abs(move.end.y - this.castleFlags[c][1]) <= 1)
              this.castleFlags[c][1] = 8;
          }
        }
      }
    }
  }

  postUndo(move) {
    super.postUndo(move);
    const c = this.turn;
    const oppCol = V.GetOppCol(c);
    // NOTE: condition on movesCount for Atomic2
    if (
      this.movesCount >= 1 &&
      [this.kingPos[c][0], this.kingPos[oppCol][0]].some(e => e < 0)
    ) {
      // There is a chance that last move blowed some king away..
      for (let psq of move.vanish) {
        if (psq.p == "k")
          this.kingPos[psq.c == c ? c : oppCol] = [psq.x, psq.y];
      }
    }
  }

  underCheck(color) {
    const oppCol = V.GetOppCol(color);
    let res = undefined;
    // If our king disappeared, move is not valid
    if (this.kingPos[color][0] < 0) res = true;
    // If opponent king disappeared, move is valid
    else if (this.kingPos[oppCol][0] < 0) res = false;
    // Otherwise, if we remain under check, move is not valid
    else res = this.isAttacked(this.kingPos[color], oppCol);
    return res;
  }

  getCheckSquares() {
    const color = this.turn;
    let res = [];
    if (
      this.kingPos[color][0] >= 0 && //king might have exploded
      this.isAttacked(this.kingPos[color], V.GetOppCol(color))
    ) {
      res = [JSON.parse(JSON.stringify(this.kingPos[color]))];
    }
    return res;
  }

  getCurrentScore() {
    const color = this.turn;
    const kp = this.kingPos[color];
    if (kp[0] < 0)
      // King disappeared
      return color == "w" ? "0-1" : "1-0";
    if (this.atLeastOneMove()) return "*";
    if (!this.isAttacked(kp, V.GetOppCol(color))) return "1/2";
    return color == "w" ? "0-1" : "1-0"; //checkmate
  }

};
