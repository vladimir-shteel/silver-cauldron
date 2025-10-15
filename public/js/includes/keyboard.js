const KB_QWERTY = 0;
const KB_AZERTY = 1;
const KB_QWERTZ = 2;

var KEY_TAB = 9;
var KEY_SHIFT = 16;
var KEY_CTRL = 17;
var KEY_ALT = 18;
var KEY_PAUSE_BREAK = 19;
var KEY_ESC = 27;
var KEY_TILDE = 192;

var KEY_F = 70;
var KEY_P = 80;

var KB_MOVE_UP;
var KB_MOVE_LEFT;
var KB_MOVE_DOWN;
var KB_MOVE_RIGHT;

var KB_MOVE_UP_LEFT;
var KB_MOVE_UP_RIGHT;
var KB_MOVE_DOWN_LEFT;
var KB_MOVE_DOWN_RIGHT;
var KB_MOVE_DOWN_ALT;

var KB_ROTATE_LEFT;
var KB_ROTATE_RIGHT;

$(document).ready(function() {
	var keyboard = parseInt($('div.playarea').attr('keyboard'));

	switch (keyboard) {
		case KB_AZERTY:
			KB_MOVE_UP = 90;
			KB_MOVE_LEFT = 81;
			KB_MOVE_DOWN = 83;
			KB_MOVE_RIGHT = 68;

			KB_MOVE_UP_LEFT = 65;
			KB_MOVE_UP_RIGHT = 69;
			KB_MOVE_DOWN_LEFT = 87;
			KB_MOVE_DOWN_RIGHT = 67;
			KB_MOVE_DOWN_ALT = 88;

			KB_ROTATE_LEFT = 65;
			KB_ROTATE_RIGHT = 69;
			break;
		case KB_QWERTZ:
			KB_MOVE_UP = 87;
			KB_MOVE_LEFT = 65;
			KB_MOVE_DOWN = 83;
			KB_MOVE_RIGHT = 68;

			KB_MOVE_UP_LEFT = 81;
			KB_MOVE_UP_RIGHT = 69;
			KB_MOVE_DOWN_LEFT = 89;
			KB_MOVE_DOWN_RIGHT = 67;
			KB_MOVE_DOWN_ALT = 88;

			KB_ROTATE_LEFT = 81;
			KB_ROTATE_RIGHT = 69;
			break;
		default:
			KB_MOVE_UP = 87;
			KB_MOVE_LEFT = 65;
			KB_MOVE_DOWN = 83;
			KB_MOVE_RIGHT = 68;

			KB_MOVE_UP_LEFT = 81;
			KB_MOVE_UP_RIGHT = 69;
			KB_MOVE_DOWN_LEFT = 90;
			KB_MOVE_DOWN_RIGHT = 67;
			KB_MOVE_DOWN_ALT = 88;

			KB_ROTATE_LEFT = 81;
			KB_ROTATE_RIGHT = 69;
	}
});
