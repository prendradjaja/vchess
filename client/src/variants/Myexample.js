import { ChessRules } from "@/base_rules";

// Copied from Hoppelpoppel
export class MyexampleRules extends ChessRules {

  getSlideNJumpMoves_([x, y], steps, oneStep, options) {
    options = options || {};
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        if (!options.onlyTake) moves.push(this.getBasicMove([x, y], [i, j]));
        if (!!oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      if (V.OnBoard(i, j) && this.canTake([x, y], [i, j]) && !options.onlyMove)
        moves.push(this.getBasicMove([x, y], [i, j]));
    }
    return moves;
  }

  getPotentialKnightMoves(sq) {
    // The knight captures like a bishop
    return (
      this.getSlideNJumpMoves_(
        sq, ChessRules.steps[V.KNIGHT], "oneStep", { onlyMove: true })
      .concat(
        this.getSlideNJumpMoves_(
          sq, ChessRules.steps[V.BISHOP], null, { onlyTake: true }))
    );
  }

  getPotentialBishopMoves(sq) {
    // The bishop captures like a knight
    return (
      this.getSlideNJumpMoves_(
        sq, ChessRules.steps[V.BISHOP], null, { onlyMove: true })
      .concat(
        this.getSlideNJumpMoves_(
          sq, ChessRules.steps[V.KNIGHT], "oneStep", { onlyTake: true }))
    );
  }

  isAttackedByKnight([x, y], color) {
    return super.isAttackedBySlideNJump(
      [x, y],
      color,
      V.KNIGHT,
      V.steps[V.BISHOP]
    );
  }

  isAttackedByBishop([x, y], color) {
    return super.isAttackedBySlideNJump(
      [x, y],
      color,
      V.BISHOP,
      V.steps[V.KNIGHT],
      "oneStep"
    );
  }

};
