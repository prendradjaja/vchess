// NOTE: alternative implementation, probably cleaner = use only 1 board
class AliceRules extends ChessRules
{
	static get ALICE_PIECES()
	{
		return {
			's': 'p',
			't': 'q',
			'u': 'r',
			'c': 'b',
			'o': 'n',
			'l': 'k',
		};
	}
	static get ALICE_CODES()
	{
		return {
			'p': 's',
			'q': 't',
			'r': 'u',
			'b': 'c',
			'n': 'o',
			'k': 'l',
		};
	}

	static getPpath(b)
	{
		return (Object.keys(this.ALICE_PIECES).includes(b[1]) ? "Alice/" : "") + b;
	}

	static get PIECES() {
		return ChessRules.PIECES.concat(Object.keys(V.ALICE_PIECES));
	}

	initVariables(fen)
	{
		super.initVariables(fen);
		const fenParts = fen.split(" ");
		const position = fenParts[0].split("/");
		if (this.kingPos["w"][0] < 0 || this.kingPos["b"][0] < 0)
		{
			// INIT_COL_XXX won't be used, so no need to set them for Alice kings
			for (let i=0; i<position.length; i++)
			{
				let k = 0; //column index on board
				for (let j=0; j<position[i].length; j++)
				{
					switch (position[i].charAt(j))
					{
						case 'l':
							this.kingPos['b'] = [i,k];
							break;
						case 'L':
							this.kingPos['w'] = [i,k];
							break;
						default:
							let num = parseInt(position[i].charAt(j));
							if (!isNaN(num))
								k += (num-1);
					}
					k++;
				}
			}
		}
	}

	// Return the (standard) color+piece notation at a square for a board
	getSquareOccupation(i, j, mirrorSide)
	{
		const piece = this.getPiece(i,j);
		if (mirrorSide==1 && Object.keys(V.ALICE_CODES).includes(piece))
			return this.board[i][j];
		else if (mirrorSide==2 && Object.keys(V.ALICE_PIECES).includes(piece))
			return this.getColor(i,j) + V.ALICE_PIECES[piece];
		return "";
	}

	// Build board of the given (mirror)side
	getSideBoard(mirrorSide)
	{
		// Build corresponding board from complete board
		let sideBoard = doubleArray(V.size.x, V.size.y, "");
		for (let i=0; i<V.size.x; i++)
		{
			for (let j=0; j<V.size.y; j++)
				sideBoard[i][j] = this.getSquareOccupation(i, j, mirrorSide);
		}
		return sideBoard;
	}

	// NOTE: castle & enPassant https://www.chessvariants.com/other.dir/alice.html
	getPotentialMovesFrom([x,y], sideBoard)
	{
		const pieces = Object.keys(V.ALICE_CODES);
		const codes = Object.keys(V.ALICE_PIECES);
		const mirrorSide = (pieces.includes(this.getPiece(x,y)) ? 1 : 2);

		// Search valid moves on sideBoard
		let saveBoard = this.board;
		this.board = sideBoard || this.getSideBoard(mirrorSide);
		let moves = super.getPotentialMovesFrom([x,y]);
		this.board = saveBoard;

		// Finally filter impossible moves
		let res = moves.filter(m => {
			if (m.appear.length == 2) //castle
			{
				// appear[i] must be an empty square on the other board
				for (let psq of m.appear)
				{
					if (this.getSquareOccupation(psq.x,psq.y,3-mirrorSide) != V.EMPTY)
						return false;
				}
			}
			else if (this.board[m.end.x][m.end.y] != V.EMPTY)
			{
				// Attempt to capture
				const piece = this.getPiece(m.end.x,m.end.y);
				if ((mirrorSide==1 && codes.includes(piece))
					|| (mirrorSide==2 && pieces.includes(piece)))
				{
					return false;
				}
			}
			// If the move is computed on board1, m.appear change for Alice pieces.
			if (mirrorSide==1)
			{
				m.appear.forEach(psq => { //forEach: castling taken into account
					psq.p = V.ALICE_CODES[psq.p]; //goto board2
				});
			}
			else //move on board2: mark vanishing pieces as Alice
			{
				m.vanish.forEach(psq => {
					psq.p = V.ALICE_CODES[psq.p];
				});
			}
			// Fix en-passant captures
			if (m.vanish[0].p == V.PAWN && m.vanish.length == 2
				&& this.board[m.end.x][m.end.y] == V.EMPTY)
			{
				m.vanish[1].c = this.getOppCol(this.getColor(x,y));
				// In the special case of en-passant, if
				//  - board1 takes board2 : vanish[1] --> Alice
				//  - board2 takes board1 : vanish[1] --> normal
				let van = m.vanish[1];
				if (mirrorSide==1 && codes.includes(this.getPiece(van.x,van.y)))
					van.p = V.ALICE_CODES[van.p];
				else if (mirrorSide==2 && pieces.includes(this.getPiece(van.x,van.y)))
					van.p = V.ALICE_PIECES[van.p];
			}
			return true;
		});
		return res;
	}

	filterValid(moves)
	{
		if (moves.length == 0)
			return [];
		let sideBoard = [this.getSideBoard(1), this.getSideBoard(2)];
		return moves.filter(m => { return !this.underCheck(m, sideBoard); });
	}

	getAllValidMoves()
	{
		const color = this.turn;
		const oppCol = this.getOppCol(color);
		var potentialMoves = [];
		let sideBoard = [this.getSideBoard(1), this.getSideBoard(2)];
		for (var i=0; i<V.size.x; i++)
		{
			for (var j=0; j<V.size.y; j++)
			{
				if (this.board[i][j] != V.EMPTY && this.getColor(i,j) == color)
				{
					const mirrorSide =
						Object.keys(V.ALICE_CODES).includes(this.getPiece(i,j))
							? 1
							: 2;
					Array.prototype.push.apply(potentialMoves,
						this.getPotentialMovesFrom([i,j], sideBoard[mirrorSide-1]));
				}
			}
		}
		return this.filterValid(potentialMoves, sideBoard);
	}

	// Play on sideboards [TODO: only one sideBoard required]
	playSide(move, sideBoard)
	{
		const pieces = Object.keys(V.ALICE_CODES);
		move.vanish.forEach(psq => {
			const mirrorSide = (pieces.includes(psq.p) ? 1 : 2);
			sideBoard[mirrorSide-1][psq.x][psq.y] = V.EMPTY;
		});
		move.appear.forEach(psq => {
			const mirrorSide = (pieces.includes(psq.p) ? 1 : 2);
			const piece = (mirrorSide == 1 ? psq.p : V.ALICE_PIECES[psq.p]);
			sideBoard[mirrorSide-1][psq.x][psq.y] = psq.c + piece;
			if (piece == V.KING)
				this.kingPos[psq.c] = [psq.x,psq.y];
		});
	}

	// Undo on sideboards
	undoSide(move, sideBoard)
	{
		const pieces = Object.keys(V.ALICE_CODES);
		move.appear.forEach(psq => {
			const mirrorSide = (pieces.includes(psq.p) ? 1 : 2);
			sideBoard[mirrorSide-1][psq.x][psq.y] = V.EMPTY;
		});
		move.vanish.forEach(psq => {
			const mirrorSide = (pieces.includes(psq.p) ? 1 : 2);
			const piece = (mirrorSide == 1 ? psq.p : V.ALICE_PIECES[psq.p]);
			sideBoard[mirrorSide-1][psq.x][psq.y] = psq.c + piece;
			if (piece == V.KING)
				this.kingPos[psq.c] = [psq.x,psq.y];
		});
	}

	underCheck(move, sideBoard) //sideBoard arg always provided
	{
		const color = this.turn;
		this.playSide(move, sideBoard); //no need to track flags
		const kp = this.kingPos[color];
		const mirrorSide = (sideBoard[0][kp[0]][kp[1]] != V.EMPTY ? 1 : 2);
		let saveBoard = this.board;
		this.board = sideBoard[mirrorSide-1];
		let res = this.isAttacked(kp, [this.getOppCol(color)]);
		this.board = saveBoard;
		this.undoSide(move, sideBoard);
		return res;
	}

	getCheckSquares(move)
	{
		this.play(move);
		const color = this.turn; //opponent
		const pieces = Object.keys(V.ALICE_CODES);
		const kp = this.kingPos[color];
		const mirrorSide = (pieces.includes(this.getPiece(kp[0],kp[1])) ? 1 : 2);
		let sideBoard = this.getSideBoard(mirrorSide);
		let saveBoard = this.board;
		this.board = sideBoard;
		let res = this.isAttacked(this.kingPos[color], [this.getOppCol(color)])
			? [ JSON.parse(JSON.stringify(this.kingPos[color])) ]
			: [ ];
		this.board = saveBoard;
		this.undo(move);
		return res;
	}

	updateVariables(move)
	{
		super.updateVariables(move); //standard king
		const piece = this.getPiece(move.start.x,move.start.y);
		const c = this.getColor(move.start.x,move.start.y);
		// "l" = Alice king
		if (piece == "l")
		{
			this.kingPos[c][0] = move.appear[0].x;
			this.kingPos[c][1] = move.appear[0].y;
			this.castleFlags[c] = [false,false];
		}
	}

	unupdateVariables(move)
	{
		super.unupdateVariables(move);
		const c = this.getColor(move.start.x,move.start.y);
		if (this.getPiece(move.start.x,move.start.y) == "l")
			this.kingPos[c] = [move.start.x, move.start.y];
	}

	checkGameEnd()
	{
		const pieces = Object.keys(V.ALICE_CODES);
		const color = this.turn;
		const kp = this.kingPos[color];
		const mirrorSide = (pieces.includes(this.getPiece(kp[0],kp[1])) ? 1 : 2);
		let sideBoard = this.getSideBoard(mirrorSide);
		let saveBoard = this.board;
		this.board = sideBoard;
		let res = "*";
		if (!this.isAttacked(this.kingPos[color], [this.getOppCol(color)]))
			res = "1/2";
		else
			res = (color == "w" ? "0-1" : "1-0");
		this.board = saveBoard;
		return res;
	}

	static get VALUES() {
		return Object.assign(
			ChessRules.VALUES,
			{
				's': 1,
				'u': 5,
				'o': 3,
				'c': 3,
				't': 9,
				'l': 1000,
			}
		);
	}

	getNotation(move)
	{
		if (move.appear.length == 2 && move.appear[0].p == V.KING)
		{
			if (move.end.y < move.start.y)
				return "0-0-0";
			else
				return "0-0";
		}

		const finalSquare = String.fromCharCode(97 + move.end.y) + (V.size.x-move.end.x);
		const piece = this.getPiece(move.start.x, move.start.y);

		const captureMark = (move.vanish.length > move.appear.length ? "x" : "");
		let pawnMark = "";
		if (["p","s"].includes(piece) && captureMark.length == 1)
			pawnMark = String.fromCharCode(97 + move.start.y); //start column

		// Piece or pawn movement
		let notation = piece.toUpperCase() + pawnMark + captureMark + finalSquare;
		if (['s','p'].includes(piece) && !['s','p'].includes(move.appear[0].p))
		{
			// Promotion
			notation += "=" + move.appear[0].p.toUpperCase();
		}
		return notation;
	}
}
