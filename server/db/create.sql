-- Database should be in this folder, and named 'vchess.sqlite'

create table Variants (
	id integer primary key,
	name varchar unique,
	description text
);

create table Users (
	id integer primary key,
	name varchar unique,
	email varchar unique,
	loginToken varchar,
	loginTime datetime,
	sessionToken varchar,
	notify boolean
);

create table Problems (
	id integer primary key,
	added datetime,
	uid integer,
	vid integer,
	fen varchar,
	instructions text,
	solution text,
	foreign key (uid) references Users(id),
	foreign key (vid) references Variants(id)
);

-- All the following tables are for correspondance play only
-- (Live games are stored only in browsers)

create table Challenges (
	id integer primary key,
	added datetime,
	uid integer,
	vid integer,
	nbPlayers integer,
	fen varchar,
	timeControl varchar,
	foreign key (uid) references Users(id),
	foreign key (vid) references Variants(id)
);

-- Store informations about players who (potentially) accept a challenge
create table WillPlay (
	yes boolean,
  cid integer,
	uid integer,
	foreign key (cid) references Challenges(id),
	foreign key (uid) references Users(id)
);

create table Games (
	id integer primary key,
	vid integer,
	fenStart varchar, --initial state
	fen varchar, --current state
	score varchar,
	mainTime integer,
	addTime integer,
	foreign key (vid) references Variants(id)
);

-- Store informations about players in a corr game
create table Players (
	gid integer,
	uid integer,
	color character,
	rtime integer, --remaining time in milliseconds
	foreign key (gid) references Games(id),
	foreign key (uid) references Users(id)
);

create table Moves (
	gid integer,
	move varchar,
	message varchar,
	played datetime, --when was this move played?
	idx integer, --index of the move in the game
	color character, --required for e.g. Marseillais Chess
	foreign key (gid) references Games(id)
);

pragma foreign_keys = on;