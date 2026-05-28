import DiceBox from '/dice-box/dice-box.es.min.js';

// Keep dice visually the same size regardless of tray dimensions.
// scale is a direct mesh multiplier; camera FOV is fixed, so a larger canvas
// renders the same world over more pixels → dice appear bigger. We compensate.
var _diceBoxEl = document.querySelector('#dice-box');
var _refSize = 500;
var _refScale = 6;
var _containerSize = _diceBoxEl
	? Math.min(_diceBoxEl.offsetWidth || _refSize, _diceBoxEl.offsetHeight || _refSize)
	: _refSize;
var _diceScale = _refScale * (_refSize / _containerSize);

var Box = new DiceBox('#dice-box', {
	assetPath: 'assets/',
	origin: window.location.origin + '/dice-box/',
	theme: 'smooth',
	themeColor: '#ff4020',
	offscreen: false,
	scale: _diceScale,
	gravity: 5
});

var dicebox_busy = false;
var dicebox_timeout = undefined;
var dicebox_callback = undefined;
var dicebox_ready = false;

Box.onRollComplete = function(rollResult) {
	var results = [];
	rollResult.forEach(function(dice) {
		dice.rolls.forEach(function(roll) {
			if ((roll.sides == 'd10') && (roll.value == 0)) {
				results.push(10);
			} else {
				results.push(roll.value);
			}
		});
	});

	dicebox_callback(results);
	dicebox_callback = undefined;

	dicebox_timeout = window.setTimeout(function() {
		dicebox_timeout = undefined;
		dicebox_hide();
	}, 5000);

	dicebox_busy = false;
};

function dice_seed(seed) {
	if (window.__dicePhysicsWorker) {
		window.__dicePhysicsWorker.postMessage({ action: 'seed', value: seed });
	}
}

window.dice_pending_throw_params = { nx: 0.5, nz: 0.5, vx: 0, vz: 0 };

function dice_set_throw_params(nx, nz, vx, vz) {
	window.dice_pending_throw_params = { nx: nx, nz: nz, vx: vx || 0, vz: vz || 0 };
}

function dice_send_throw_params() {
	if (window.__dicePhysicsWorker) {
		var p = window.dice_pending_throw_params;
		window.__dicePhysicsWorker.postMessage({ action: 'throw_params', nx: p.nx, nz: p.nz, vx: p.vx, vz: p.vz });
	}
	window.dice_pending_throw_params = { nx: 0.5, nz: 0.5, vx: 0, vz: 0 };
}

function dice_roll_3d(dice, callback, seed) {
	if (dicebox_busy) {
		return false;
	}

	dicebox_callback = callback;
	dicebox_busy = true;

	$('body').append($('div#dice-box'));
	$('div#dice-box').css('z-index', 1).addClass('rolling');

	dicebox_clear_timer();

	dicebox_init_promise.then(function() {
		if (seed !== undefined) {
			dice_seed(seed);
		}
		dice_send_throw_params();
		Box.roll(dice);
	});

	var audio = new Audio('/dice-box/diceroll.mp3');
	audio.play();

	return true;
}

function dicebox_clear_timer() {
	if (dicebox_timeout != undefined) {
		window.clearTimeout(dicebox_timeout);
		dicebox_timeout = undefined;
	}
}

function dicebox_hide() {
	$('body').prepend($('div#dice-box'));
	$('div#dice-box').css('z-index', '').removeClass('rolling');
}

function dicebox_color(color) {
	Box.config.themeColor = color;
	localStorage.setItem('dice_color', color);
}

var dicebox_init_promise = Box.init().then(function() {
	dicebox_ready = true;
});


$(document).ready(function() {
	dicebox_hide();

	var color = localStorage.getItem('dice_color');
	if (color != undefined) {
		dicebox_color(color);
	}
});

function dice_animate_only(dice, seed) {
	dice_roll_3d(dice, function() {}, seed);
}

window.dice_roll_3d = dice_roll_3d;
window.dicebox_color = dicebox_color;
window.dice_animate_only = dice_animate_only;
window.dice_set_throw_params = dice_set_throw_params;

export { dice_roll_3d, dicebox_color, dice_animate_only };
