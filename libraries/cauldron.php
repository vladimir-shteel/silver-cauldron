<?php
	define("CAULDRON_VERSION", "3.8");

	define("UPDATE_TABLES", array("menu", "pages"));

	define("PLAYER_ROLE_ID", 2);
	define("DUNGEON_MASTER_ROLE_ID", 3);
	define("USER_MAINTAINER_ROLE_ID", 4);

	define("ADVENTURE_ACCESS_DM_ONLY", 0);
	define("ADVENTURE_ACCESS_PLAYERS", 1);
	define("ADVENTURE_ACCESS_PLAYERS_SPECTATORS", 2);

	define("MAX_CHARACTER_COUNT", 12);
	define("MAX_CHARACTER_TOKEN_SIZE", 300 * 1024);

	define("KEYBOARDS", array("Qwerty", "Azerty", "Qwertz"));

	define("FOW_NONE", 0);
	define("FOW_DAY_CELL", 1);
	define("FOW_DAY_REAL", 2);
	define("FOW_NIGHT_CELL", 3);
	define("FOW_NIGHT_REAL", 4);
	define("FOW_REVEAL", 5);

	define("MARKET_DIRECTORY", "files/market/");
	define("BRUSH_DIRECTORY", "files/brushes/");

	define("JOURNAL_UNKNOWN_USER", "<unknown>");
	define("AGENDA_KEY_LENGTH", 10);

	define("USER_SUB_DIRECTORIES", array("audio", "brushes", "characters",
		"collectables", "effects", "maps", "pictures", "tokens"));

	define("CONDITIONS", array("blinded", "charmed", "deafened", "exhausted",
		"frightened", "grappled", "incapacitated", "invisible", "paralyzed",
		"petrified", "poisoned", "prone", "restrained", "stunned", "unconscious",
		"A / red", "B / orange", "C / yellow", "D / green", "E / blue", "F / purple"));

	define("TOKEN_DEFAULT_AC", 10);
	define("TOKEN_DEFAULT_HP", 4);

	define("CR_to_XP", array(
		"0"   => 10,
		"1/8" => 25,
		"1/4" => 50,
		"1/2" => 100,
		"1"   => 200,
		"2"   => 450,
		"3"   => 700,
		"4"   => 1100,
		"5"   => 1800,
		"6"   => 2300,
		"7"   => 2900,
		"8"   => 3900,
		"9"   => 5000,
		"10"  => 5900,
		"11"  => 7200,
		"12"  => 8400,
		"13"  => 10000,
		"14"  => 11500,
		"15"  => 13000,
		"16"  => 15000,
		"17"  => 18000,
		"18"  => 20000,
		"19"  => 22000,
		"20"  => 25000,
		"21"  => 33000,
		"22"  => 41000,
		"23"  => 50000,
		"24"  => 62000,
		"25"  => 75000,
		"26"  => 90000,
		"27"  => 10500,
		"28"  => 12000,
		"29"  => 13500,
		"30"  => 15500));
?>
