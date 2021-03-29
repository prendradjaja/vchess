import { ChessRules } from "@/base_rules";

export class MyexampleRules extends ChessRules {

  static get PawnSpecs() {
    return Object.assign(
      {},
      ChessRules.PawnSpecs,
      {
        promotions:
          ChessRules.PawnSpecs.promotions
          .concat([V.EMPRESS, /* ADD_MORE_PIECES_HERE */])
      }
    );
  }

  getPpath(b) {
    if (b[1] === 'e') {
      return "Perfect/" + b;
    } else {
      return b;
    }
    // return (
    //   [V.AMAZON, V.EMPRESS, V.PRINCESS].includes(b[1])
    //     ? "Perfect/"
    //     : ""
    // ) + b;
  }

  static GenRandInitFen(randomness) {
    // TODO support randomness
    // return "rnbqkbne/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNE w 0 ahah -";
    return "k7/8/8/p7/P1P5/1P1P2E1/4P3/7K w 0 ahah -";
  }


  // Rook + knight
  static get EMPRESS() {
    return "e";
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.EMPRESS, /* ADD_MORE_PIECES_HERE */]);
  }

  getPotentialMovesFrom([x, y]) {
    switch (this.getPiece(x, y)) {
      case V.EMPRESS:
        return this.getPotentialEmpressMoves([x, y]);
      default:
        return super.getPotentialMovesFrom([x, y]);
    }
  }

  static get steps() {
    return Object.assign(
      {},
      ChessRules.steps,
      {
        // I added "$" to avoid conflict with piece abbreviations (e.g. W for Woody Rook would conflict with W for Wazir)
        // Dabbabah
        '$d': [
          [-2, 0],
          [0, -2],
          [2, 0],
          [0, 2]
        ],
        // Wazir
        '$w': [
          [-1, 0],
          [0, -1],
          [1, 0],
          [0, 1]
        ],
        // Alfil
        '$a': [
          [2, 2],
          [2, -2],
          [-2, 2],
          [-2, -2]
        ],
        // Ferz
        '$f': [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1]
        ],
        // Threeleaper
        '$3': [
          [-3, 0],
          [0, -3],
          [3, 0],
          [0, 3]
        ],
      }
    );
  }

  getPotentialEmpressMoves(sq) {
    return [].concat(
      this.getSlideNJumpMoves(sq, V.steps.$d, "oneStep"),
      this.getSlideNJumpMoves(sq, V.steps.$w, "oneStep"),
    );
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByEmpress(sq, color)
      // ADD_MORE_PIECES_HERE
    );
  }

  isAttackedByEmpress(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.EMPRESS, V.steps.$d, "oneStep") ||
      this.isAttackedBySlideNJump(sq, color, V.EMPRESS, V.steps.$w, "oneStep") ||
      false // || false can be removed later, doesn't do anything, is just here for ease of editing
    );
  }

  static get VALUES() {
    return Object.assign(
      // these values are just guesses
      { e: 7 }, // ADD_MORE_PIECES_HERE
      ChessRules.VALUES
    );
  }

  static get SEARCH_DEPTH() {
    // Not sure if needed. Default is 3, but set to 2 in Perfect, Schess, and Colorbound.
    return 2;
  }

};
