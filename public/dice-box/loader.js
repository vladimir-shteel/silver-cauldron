const DICEBOX_INCLUDED = true;

/* Intercept Worker constructor to capture the physics worker reference.
 * dice-box creates exactly one inline blob Worker (the Ammo.js physics engine).
 * We capture it so we can send it a seed before each roll.
 */
(function() {
	var _OriginalWorker = window.Worker;
	window.Worker = function(url, opts) {
		var w = new _OriginalWorker(url, opts);
		window.__dicePhysicsWorker = w;
		return w;
	};
	window.Worker.prototype = _OriginalWorker.prototype;
})();

$(document).ready(function() {
	$('head').append('<link rel="stylesheet" type="text/css" href="/dice-box/stylesheet.css">');
	$('body').prepend('<div id="dice-box"></div>');
	$('head').append('<script type="module" src="/dice-box/dice-box.js">import dicebox_roll from "/dice-box/dice-box.js"; window.dicebox_roll = dicebox_roll;</script>');
});
