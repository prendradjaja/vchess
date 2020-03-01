import { ChessRules } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt } from "@/utils/alea";

export const VariantRules = class GrasshopperRules extends ChessRules {
  static get GRASSHOPPER() {
    return "g";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.GRASSHOPPER]);
  }

  getPpath(b) {
    return (b[1] == V.GRASSHOPPER ? "Grasshopper/" : "") + b;
  }

  getPotentialMovesFrom([x, y]) {
    switch (this.getPiece(x, y)) {
      case V.GRASSHOPPER:
        return this.getPotentialGrasshopperMoves([x, y]);
      default:
        return super.getPotentialMovesFrom([x, y]);
    }
  }

  getPotentialGrasshopperMoves([x, y]) {
    let moves = [];
    // Look in every direction until an obstacle (to jump) is met
    for (const step of V.steps[V.ROOK].concat(V.steps[V.BISHOP])) {
      let i = x + step[0];
      let j = y + step[1];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
      }
      // Move is valid if the next square is empty or occupied by enemy
      const nextSq = [i+step[0], j+step[1]];
      if (V.OnBoard(nextSq[0], nextSq[1]) && this.canTake([x, y], nextSq))
        moves.push(this.getBasicMove([x, y], nextSq));
    }
    return moves;
  }

  isAttacked(sq, colors) {
    return (
      super.isAttacked(sq, colors) ||
      this.isAttackedByGrasshopper(sq, colors)
    );
  }

  isAttackedByGrasshopper([x, y], colors) {
    // Reversed process: is there an adjacent obstacle,
    // and a grasshopper next in the same line?
    for (const step of V.steps[V.ROOK].concat(V.steps[V.BISHOP])) {
      const nextSq = [x+step[0], y+step[1]];
      if (
        V.OnBoard(nextSq[0], nextSq[1]) &&
        this.board[nextSq[0]][nextSq[1]] != V.EMPTY
      ) {
        let i = nextSq[0] + step[0];
        let j = nextSq[1] + step[1];
        while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
          i += step[0];
          j += step[1];
        }
        if (
          V.OnBoard(i, j) &&
          this.getPiece(i, j) == V.GRASSHOPPER &&
          colors.includes(this.getColor(i, j))
        ) {
          return true;
        }
      }
    }
    return false;
  }

  static get VALUES() {
    return Object.assign(
      // TODO: grasshoppers power decline with less pieces on board...
      { g: 2 },
      ChessRules.VALUES
    );
  }

  static GenRandInitFen() {
    return ChessRules.GenRandInitFen()
      .replace(
        "/pppppppp/8/8/8/8/PPPPPPPP/",
        "/gggggggg/pppppppp/8/8/PPPPPPPP/GGGGGGGG/"
      );
  }
};
