import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { shuffle } from "@/utils/alea";

export class MaximaRules extends ChessRules {

  static get HasFlags() {
    return false;
  }

  static get HasEnpassant() {
    return false;
  }

  static get PIECES() {
    return ChessRules.PIECES.concat([V.IMMOBILIZER, V.MAGE, V.GUARD]);
  }

  getPpath(b) {
    if (b[0] == 'x') return "Maxima/nothing";
    if (['m','d','g'].includes(b[1]))
      return "Maxima/" + b;
    return b;
  }

  // For space next to the palaces:
  static get NOTHING() {
    return "xx";
  }

  static board2fen(b) {
    if (b[0] == 'x') return 'x';
    return ChessRules.board2fen(b);
  }

  static fen2board(f) {
    if (f == 'x') return V.NOTHING;
    return ChessRules.fen2board(f);
  }

  // TODO: the wall position should be checked too
  static IsGoodPosition(position) {
    if (position.length == 0) return false;
    const rows = position.split("/");
    if (rows.length != V.size.x) return false;
    let kings = { "k": 0, "K": 0 };
    for (let row of rows) {
      let sumElts = 0;
      for (let i = 0; i < row.length; i++) {
        if (['K','k'].includes(row[i])) kings[row[i]]++;
        if (['x'].concat(V.PIECES).includes(row[i].toLowerCase())) sumElts++;
        else {
          const num = parseInt(row[i], 10);
          if (isNaN(num)) return false;
          sumElts += num;
        }
      }
      if (sumElts != V.size.y) return false;
    }
    if (Object.values(kings).some(v => v != 1)) return false;
    return true;
  }

  // No castling, but checks, so keep track of kings
  setOtherVariables(fen) {
    this.kingPos = { w: [-1, -1], b: [-1, -1] };
    const fenParts = fen.split(" ");
    const position = fenParts[0].split("/");
    for (let i = 0; i < position.length; i++) {
      let k = 0;
      for (let j = 0; j < position[i].length; j++) {
        switch (position[i].charAt(j)) {
          case "k":
            this.kingPos["b"] = [i, k];
            break;
          case "K":
            this.kingPos["w"] = [i, k];
            break;
          default: {
            const num = parseInt(position[i].charAt(j), 10);
            if (!isNaN(num)) k += num - 1;
          }
        }
        k++;
      }
    }
  }

  static get size() {
    return { x: 11, y: 8 };
  }

  static OnBoard(x, y) {
    return (
      (x >= 1 && x <= 9 && y >= 0 && y <= 7) ||
      ([3, 4].includes(y) && [0, 10].includes(x))
    );
  }

  static get IMMOBILIZER() {
    return "m";
  }
  static get MAGE() {
    return 'g';
  }
  static get GUARD() {
    return 'd';
  }
  // Although other pieces keep their names here for coding simplicity,
  // keep in mind that:
  //  - a "rook" is a coordinator, capturing by coordinating with the king
  //  - a "knight" is a long-leaper, capturing as in draughts
  //  - a "bishop" is a chameleon, capturing as its prey
  //  - a "queen" is a withdrawer, capturing by moving away from pieces

  // Is piece on square (x,y) immobilized?
  isImmobilized([x, y]) {
    const piece = this.getPiece(x, y);
    if (piece == V.MAGE)
      // Mages are not immobilized:
      return false;
    const oppCol = V.GetOppCol(this.getColor(x, y));
    const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    for (let step of adjacentSteps) {
      const [i, j] = [x + step[0], y + step[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == oppCol
      ) {
        const oppPiece = this.getPiece(i, j);
        if (oppPiece == V.IMMOBILIZER) return [i, j];
        // Only immobilizers are immobilized by chameleons:
        if (oppPiece == V.BISHOP && piece == V.IMMOBILIZER) return [i, j];
      }
    }
    return null;
  }

  getPotentialMovesFrom([x, y]) {
    // Pre-check: is thing on this square immobilized?
    const imSq = this.isImmobilized([x, y]);
    const piece = this.getPiece(x, y);
    if (!!imSq && piece != V.KING) {
      // Only option is suicide, if I'm not a king:
      return [
        new Move({
          start: { x: x, y: y },
          end: { x: imSq[0], y: imSq[1] },
          appear: [],
          vanish: [
            new PiPo({
              x: x,
              y: y,
              c: this.getColor(x, y),
              p: this.getPiece(x, y)
            })
          ]
        })
      ];
    }
    let moves = undefined;
    switch (piece) {
      case V.IMMOBILIZER:
        moves = this.getPotentialImmobilizerMoves([x, y]);
        break;
      case V.GUARD:
        moves = this.getPotentialGuardMoves([x, y]);
        break;
      case V.MAGE:
        moves = this.getPotentialMageMoves([x, y]);
        break;
      default:
        moves = super.getPotentialMovesFrom([x, y]);
    }
    const pX = (this.turn == 'w' ? 10 : 0);
    if (this.board[pX][3] == V.EMPTY && this.board[pX][4] == V.EMPTY)
      return moves;
    // Filter out moves resulting in self palace occupation:
    // NOTE: cannot invade own palace but still check the king there.
    const pY = (this.board[pX][3] != V.EMPTY ? 4 : 3);
    return moves.filter(m => m.end.x != pX || m.end.y != pY);
  }

  getSlideNJumpMoves([x, y], steps, oneStep, mageInitSquare) {
    const piece = !mageInitSquare ? this.getPiece(x, y) : V.MAGE;
    const initSquare = mageInitSquare || [x, y];
    let moves = [];
    outerLoop: for (let step of steps) {
      let i = x + step[0];
      let j = y + step[1];
      if (piece == V.KING) j = j % V.size.y;
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        moves.push(this.getBasicMove(initSquare, [i, j]));
        if (!!oneStep) continue outerLoop;
        i += step[0];
        j += step[1];
      }
      // Only king, guard and mage (+ chameleon) can take on occupied square:
      if (
        V.OnBoard(i, j) &&
        [V.KING, V.GUARD, V.MAGE].includes(piece) &&
        this.canTake(initSquare, [i, j])
      ) {
        moves.push(this.getBasicMove(initSquare, [i, j]));
      }
    }
    return moves;
  }

  // Modify capturing moves among listed pawn moves
  addPawnCaptures(moves, byChameleon) {
    const steps = V.steps[V.ROOK];
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    moves.forEach(m => {
      if (!!byChameleon && m.start.x != m.end.x && m.start.y != m.end.y)
        // Chameleon not moving as pawn
        return;
      // Try capturing in every direction
      for (let step of steps) {
        const sq2 = [m.end.x + 2 * step[0], m.end.y + 2 * step[1]];
        if (
          V.OnBoard(sq2[0], sq2[1]) &&
          this.board[sq2[0]][sq2[1]] != V.EMPTY &&
          this.getColor(sq2[0], sq2[1]) == color
        ) {
          // Potential capture
          const sq1 = [m.end.x + step[0], m.end.y + step[1]];
          if (
            this.board[sq1[0]][sq1[1]] != V.EMPTY &&
            this.getColor(sq1[0], sq1[1]) == oppCol
          ) {
            const piece1 = this.getPiece(sq1[0], sq1[1]);
            if (!byChameleon || piece1 == V.PAWN) {
              m.vanish.push(
                new PiPo({
                  x: sq1[0],
                  y: sq1[1],
                  c: oppCol,
                  p: piece1
                })
              );
            }
          }
        }
      }
    });
  }

  // "Pincer"
  getPotentialPawnMoves([x, y]) {
    let moves = super.getPotentialRookMoves([x, y]);
    this.addPawnCaptures(moves);
    return moves;
  }

  addRookCaptures(moves, byChameleon) {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    const kp = this.kingPos[color];
    moves.forEach(m => {
      // Check piece-king rectangle (if any) corners for enemy pieces
      if (m.end.x == kp[0] || m.end.y == kp[1]) return; //"flat rectangle"
      const corner1 = [m.end.x, kp[1]];
      const corner2 = [kp[0], m.end.y];
      for (let [i, j] of [corner1, corner2]) {
        if (this.board[i][j] != V.EMPTY && this.getColor(i, j) == oppCol) {
          const piece = this.getPiece(i, j);
          if (!byChameleon || piece == V.ROOK) {
            m.vanish.push(
              new PiPo({
                x: i,
                y: j,
                p: piece,
                c: oppCol
              })
            );
          }
        }
      }
    });
  }

  // Coordinator
  getPotentialRookMoves(sq) {
    let moves = super.getPotentialQueenMoves(sq);
    this.addRookCaptures(moves);
    return moves;
  }

  getKnightCaptures(startSquare, byChameleon) {
    // Look in every direction for captures
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    let moves = [];
    const [x, y] = [startSquare[0], startSquare[1]];
    const piece = this.getPiece(x, y); //might be a chameleon!
    outerLoop: for (let step of steps) {
      let [i, j] = [x + step[0], y + step[1]];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += step[0];
        j += step[1];
      }
      if (
        !V.OnBoard(i, j) ||
        this.getColor(i, j) == color ||
        (!!byChameleon && this.getPiece(i, j) != V.KNIGHT)
      ) {
        continue;
      }
      // last(thing), cur(thing) : stop if "cur" is our color,
      // or beyond board limits, or if "last" isn't empty and cur neither.
      // Otherwise, if cur is empty then add move until cur square;
      // if cur is occupied then stop if !!byChameleon and the square not
      // occupied by a leaper.
      let last = [i, j];
      let cur = [i + step[0], j + step[1]];
      let vanished = [new PiPo({ x: x, y: y, c: color, p: piece })];
      while (V.OnBoard(cur[0], cur[1])) {
        if (this.board[last[0]][last[1]] != V.EMPTY) {
          const oppPiece = this.getPiece(last[0], last[1]);
          if (!!byChameleon && oppPiece != V.KNIGHT) continue outerLoop;
          // Something to eat:
          vanished.push(
            new PiPo({ x: last[0], y: last[1], c: oppCol, p: oppPiece })
          );
        }
        if (this.board[cur[0]][cur[1]] != V.EMPTY) {
          if (
            this.getColor(cur[0], cur[1]) == color ||
            this.board[last[0]][last[1]] != V.EMPTY
          ) {
            //TODO: redundant test
            continue outerLoop;
          }
        } else {
          moves.push(
            new Move({
              appear: [new PiPo({ x: cur[0], y: cur[1], c: color, p: piece })],
              vanish: JSON.parse(JSON.stringify(vanished)), //TODO: required?
              start: { x: x, y: y },
              end: { x: cur[0], y: cur[1] }
            })
          );
        }
        last = [last[0] + step[0], last[1] + step[1]];
        cur = [cur[0] + step[0], cur[1] + step[1]];
      }
    }
    return moves;
  }

  // Long-leaper
  getPotentialKnightMoves(sq) {
    return super.getPotentialQueenMoves(sq).concat(this.getKnightCaptures(sq));
  }

  // Chameleon
  getPotentialBishopMoves([x, y]) {
    let moves = super
      .getPotentialQueenMoves([x, y])
      .concat(this.getKnightCaptures([x, y], "asChameleon"))
    // No "king capture" because king cannot remain under check
    this.addPawnCaptures(moves, "asChameleon");
    this.addRookCaptures(moves, "asChameleon");
    this.addQueenCaptures(moves, "asChameleon");
    // Manually add Guard and Mage captures (since cannot move like a Mage)
    V.steps[V.ROOK].concat(V.steps[V.BISHOP]).forEach(step => {
      const [i, j] = [x + step[0], y + step[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.canTake([x, y], [i, j]) &&
        [V.GUARD, V.MAGE].includes(this.getPiece(i, j))
      ) {
        moves.push(this.getBasicMove([x, y], [i, j]));
      }
    });
    // Post-processing: merge similar moves, concatenating vanish arrays
    let mergedMoves = {};
    moves.forEach(m => {
      const key = m.end.x + V.size.x * m.end.y;
      if (!mergedMoves[key]) mergedMoves[key] = m;
      else {
        for (let i = 1; i < m.vanish.length; i++)
          mergedMoves[key].vanish.push(m.vanish[i]);
      }
    });
    return Object.values(mergedMoves);
  }

  addQueenCaptures(moves, byChameleon) {
    if (moves.length == 0) return;
    const [x, y] = [moves[0].start.x, moves[0].start.y];
    const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    let capturingDirections = [];
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    adjacentSteps.forEach(step => {
      const [i, j] = [x + step[0], y + step[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == oppCol &&
        (!byChameleon || this.getPiece(i, j) == V.QUEEN)
      ) {
        capturingDirections.push(step);
      }
    });
    moves.forEach(m => {
      const step = [
        m.end.x != x ? (m.end.x - x) / Math.abs(m.end.x - x) : 0,
        m.end.y != y ? (m.end.y - y) / Math.abs(m.end.y - y) : 0
      ];
      // TODO: this test should be done only once per direction
      if (
        capturingDirections.some(dir => {
          return dir[0] == -step[0] && dir[1] == -step[1];
        })
      ) {
        const [i, j] = [x - step[0], y - step[1]];
        m.vanish.push(
          new PiPo({
            x: i,
            y: j,
            p: this.getPiece(i, j),
            c: oppCol
          })
        );
      }
    });
  }

  // Withdrawer
  getPotentialQueenMoves(sq) {
    let moves = super.getPotentialQueenMoves(sq);
    this.addQueenCaptures(moves);
    return moves;
  }

  getPotentialImmobilizerMoves(sq) {
    // Immobilizer doesn't capture
    return super.getPotentialQueenMoves(sq);
  }

  getPotentialKingMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps[V.KNIGHT], "oneStep");
  }

  getPotentialGuardMoves(sq) {
    return (
      this.getSlideNJumpMoves(
        sq,
        V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
        "oneStep",
        null
      )
    );
  }

  getNextMageSteps(step) {
    if (step[0] == -1) {
      if (step[1] == -1) return [[-1, 0], [0, -1]];
      return [[-1, 0], [0, 1]];
    }
    if (step[1] == -1) return [[1, 0], [0, -1]];
    return [[1, 0], [0, 1]];
  }

  getPotentialMageMoves([x, y]) {
    const oppCol = V.GetOppCol(this.turn);
    let moves = [];
    for (let step of V.steps[V.BISHOP]) {
      let [i, j] = [x + step[0], y + step[1]];
      if (!V.OnBoard(i, j)) continue;
      if (this.board[i][j] != V.EMPTY) {
        if (this.getColor(i, j) == oppCol)
          // Capture
          moves.push(this.getBasicMove([x, y], [i, j]));
      }
      else {
        moves.push(this.getBasicMove([x, y], [i, j]));
        // Continue orthogonally:
        const stepO = this.getNextMageSteps(step);
        Array.prototype.push.apply(
          moves,
          this.getSlideNJumpMoves([i, j], stepO, null, [x, y])
        );
      }
    }
    return moves;
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByGuard(sq, color) ||
      this.isAttackedByMage(sq, color)
    );
  }

  isAttackedByPawn([x, y], color) {
    // Square (x,y) must be surroundable by two enemy pieces,
    // and one of them at least should be a pawn (moving).
    const dirs = [
      [1, 0],
      [0, 1]
    ];
    const steps = V.steps[V.ROOK];
    for (let dir of dirs) {
      const [i1, j1] = [x - dir[0], y - dir[1]]; //"before"
      const [i2, j2] = [x + dir[0], y + dir[1]]; //"after"
      if (V.OnBoard(i1, j1) && V.OnBoard(i2, j2)) {
        if (
          (
            this.board[i1][j1] != V.EMPTY &&
            this.getColor(i1, j1) == color &&
            this.board[i2][j2] == V.EMPTY
          )
          ||
          (
            this.board[i2][j2] != V.EMPTY &&
            this.getColor(i2, j2) == color &&
            this.board[i1][j1] == V.EMPTY
          )
        ) {
          // Search a movable enemy pawn landing on the empty square
          for (let step of steps) {
            let [ii, jj] = this.board[i1][j1] == V.EMPTY ? [i1, j1] : [i2, j2];
            let [i3, j3] = [ii + step[0], jj + step[1]];
            while (V.OnBoard(i3, j3) && this.board[i3][j3] == V.EMPTY) {
              i3 += step[0];
              j3 += step[1];
            }
            if (
              V.OnBoard(i3, j3) &&
              this.getColor(i3, j3) == color &&
              this.getPiece(i3, j3) == V.PAWN &&
              !this.isImmobilized([i3, j3])
            ) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  isAttackedByRook([x, y], color) {
    // King must be on same column or row,
    // and a rook should be able to reach a capturing square
    const sameRow = x == this.kingPos[color][0];
    const sameColumn = y == this.kingPos[color][1];
    if (sameRow || sameColumn) {
      // Look for the enemy rook (maximum 1)
      for (let i = 0; i < V.size.x; i++) {
        for (let j = 0; j < V.size.y; j++) {
          if (
            this.board[i][j] != V.EMPTY &&
            this.getColor(i, j) == color &&
            this.getPiece(i, j) == V.ROOK
          ) {
            if (this.isImmobilized([i, j]))
              // Because only one rook:
              return false;
            // Can it reach a capturing square? Easy but quite suboptimal way
            // (TODO: generate all moves (turn is OK))
            const moves = this.getPotentialMovesFrom([i, j]);
            for (let move of moves) {
              if (
                (sameRow && move.end.y == y) ||
                (sameColumn && move.end.x == x)
              ) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  isAttackedByKnight([x, y], color) {
    // Square (x,y) must be on same line as a knight,
    // and there must be empty square(s) behind.
    const steps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    outerLoop: for (let step of steps) {
      const [i0, j0] = [x + step[0], y + step[1]];
      if (V.OnBoard(i0, j0) && this.board[i0][j0] == V.EMPTY) {
        // Try in opposite direction:
        let [i, j] = [x - step[0], y - step[1]];
        while (V.OnBoard(i, j)) {
          while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
            i -= step[0];
            j -= step[1];
          }
          if (V.OnBoard(i, j)) {
            if (this.getColor(i, j) == color) {
              if (
                this.getPiece(i, j) == V.KNIGHT &&
                !this.isImmobilized([i, j])
              ) {
                return true;
              }
              continue outerLoop;
            }
            // [else] Our color,
            // could be captured *if there was an empty space*
            if (this.board[i + step[0]][j + step[1]] != V.EMPTY)
              continue outerLoop;
            i -= step[0];
            j -= step[1];
          }
        }
      }
    }
    return false;
  }

  isAttackedByBishop([x, y], color) {
    // We cheat a little here: since this function is used exclusively for
    // the king, it's enough to check the immediate surrounding of the square.
    const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    for (let step of adjacentSteps) {
      const [i, j] = [x + step[0], y + step[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == color &&
        this.getPiece(i, j) == V.BISHOP &&
        !this.isImmobilized([i, j])
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedByQueen([x, y], color) {
    // Square (x,y) must be adjacent to a queen, and the queen must have
    // some free space in the opposite direction from (x,y)
    const adjacentSteps = V.steps[V.ROOK].concat(V.steps[V.BISHOP]);
    for (let step of adjacentSteps) {
      const sq2 = [x + 2 * step[0], y + 2 * step[1]];
      if (V.OnBoard(sq2[0], sq2[1]) && this.board[sq2[0]][sq2[1]] == V.EMPTY) {
        const sq1 = [x + step[0], y + step[1]];
        if (
          this.board[sq1[0]][sq1[1]] != V.EMPTY &&
          this.getColor(sq1[0], sq1[1]) == color &&
          this.getPiece(sq1[0], sq1[1]) == V.QUEEN &&
          !this.isImmobilized(sq1)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  isAttackedByKing([x, y], color) {
    for (let step of V.steps[V.KNIGHT]) {
      let rx = x + step[0],
          // Circular board for king-knight:
          ry = (y + step[1]) % V.size.y;
      if (
        V.OnBoard(rx, ry) &&
        this.getPiece(rx, ry) === V.KING &&
        this.getColor(rx, ry) == color &&
        !this.isImmobilized([rx, ry])
      ) {
        return true;
      }
    }
    return false;
  }

  isAttackedByGuard(sq, color) {
    return (
      super.isAttackedBySlideNJump(
        sq,
        color,
        V.GUARD,
        V.steps[V.ROOK].concat(V.steps[V.BISHOP]),
        "oneStep"
      )
    );
  }

  getNextMageCheck(step) {
    if (step[0] == 0) {
      if (step[1] == 1) return [[1, 1], [-1, 1]];
      return [[-1, -1], [1, -1]];
    }
    if (step[0] == -1) return [[-1, -1], [-1, 1]];
    return [[1, 1], [1, -1]];
  }

  isAttackedByMage([x, y], color) {
    for (let step of V.steps[V.BISHOP]) {
      const [i, j] = [x + step[0], y + step[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getColor(i, j) == color &&
        this.getPiece(i, j) == V.MAGE
      ) {
        return true;
      }
    }
    for (let step of V.steps[V.ROOK]) {
      let [i, j] = [x + step[0], y + step[1]];
      const stepM = this.getNextMageCheck(step);
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        for (let s of stepM) {
          const [ii, jj] = [i + s[0], j + s[1]];
          if (
            V.OnBoard(ii, jj) &&
            this.board[ii][jj] != V.EMPTY &&
            this.getColor(ii, jj) == color &&
            this.getPiece(ii, jj) == V.MAGE
          ) {
            return true;
          }
        }
        i += step[0];
        j += step[1];
      }
    }
    return false;
  }

  getCurrentScore() {
    const color = this.turn;
    const getScoreLost = () => {
      // Result if I lose:
      return color == "w" ? "0-1" : "1-0";
    };
    if (!this.atLeastOneMove()) {
      // No valid move: I lose or draw
      if (this.underCheck(color)) return getScoreLost();
      return "1/2";
    }
    // I lose also if no pieces left (except king)
    let piecesLeft = 0;
    outerLoop: for (let i=0; i<V.size.x; i++) {
      for (let j=0; j<V.size.y; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == color &&
          this.getPiece(i,j) != V.KING
        ) {
          piecesLeft++;
        }
      }
    }
    if (piecesLeft == 0) return getScoreLost();
    // Check if my palace is invaded:
    const pX = (color == 'w' ? 10 : 0);
    const oppCol = V.GetOppCol(color);
    if (
      this.board[pX][3] != V.EMPTY &&
      this.getColor(pX, 3) == oppCol &&
      this.board[pX][4] != V.EMPTY &&
      this.getColor(pX, 4) == oppCol
    ) {
      return getScoreLost();
    }
    return "*";
  }

  static GenRandInitFen() {
    // Always deterministic:
    return (
      "xxx2xxx/1g1qk1g1/1bnmrnb1/dppppppd/8/8/8/" +
      "DPPPPPPD/1BNMRNB1/1G1QK1G1/xxx2xxx w 0"
    );
  }

  static get VALUES() {
    return {
      p: 1,
      r: 2,
      n: 5,
      b: 4,
      q: 2,
      m: 5,
      g: 7,
      d: 4,
      k: 1000
    };
  }

  static get SEARCH_DEPTH() {
    return 2;
  }

  evalPosition() {
    let evaluation = 0;
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (![V.EMPTY,V.NOTHING].includes(this.board[i][j])) {
          const sign = this.getColor(i, j) == "w" ? 1 : -1;
          evaluation += sign * V.VALUES[this.getPiece(i, j)];
        }
      }
    }
    return evaluation;
  }

  getNotation(move) {
    const initialSquare = V.CoordsToSquare(move.start);
    const finalSquare = V.CoordsToSquare(move.end);
    if (move.appear.length == 0)
      // Suicide 'S'
      return initialSquare + "S";
    let notation = undefined;
    if (move.appear[0].p == V.PAWN) {
      // Pawn: generally ambiguous short notation, so we use full description
      notation = "P" + initialSquare + finalSquare;
    } else if (move.appear[0].p == V.KING)
      notation = "K" + (move.vanish.length > 1 ? "x" : "") + finalSquare;
    else notation = move.appear[0].p.toUpperCase() + finalSquare;
    // Add a capture mark (not describing what is captured...):
    if (move.vanish.length > 1 && move.appear[0].p != V.KING) notation += "X";
    return notation;
  }

};
