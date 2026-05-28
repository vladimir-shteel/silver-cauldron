const DICE_ROLL_NORMAL = 0;
const DICE_ROLL_ADVANTAGE = 1;
const DICE_ROLL_DISADVANTAGE = 2;

var wf_dice_roll = null;
var custom_dice = [];
var custom_rolls = [];

function dice_roll(dice, callback, send_to_others = false, share_anim = undefined) {
	/* share_anim: true  = always broadcast animation (even if result is private)
	 *             false = never broadcast animation
	 *             undefined = follow send_to_others
	 */
	var should_anim = (share_anim !== undefined) ? share_anim : send_to_others;

	if ((localStorage.getItem('dice_type') == 'animated') && (typeof dice_roll_3d == 'function')) {
		var seed = Math.floor(Math.random() * 0xFFFFFFFF);
		var throw_params = window.dice_pending_throw_params || { nx: 0.5, nz: 0.5, vx: 0, vz: 0 };
		var success = dice_roll_3d(dice, callback, seed);
		if (success && should_anim && (typeof websocket_send == 'function')) {
			websocket_send({ action: 'dice_animate', dice: dice, seed: seed,
			                 throw_nx: throw_params.nx, throw_nz: throw_params.nz,
			                 throw_vx: throw_params.vx || 0, throw_vz: throw_params.vz || 0 });
		}
		return success;
	} else {
		window.dice_pending_throw_params = { nx: 0.5, nz: 0.5, vx: 0, vz: 0 };
		return dice_roll_quick(dice, callback);
	}
}

function dice_roll_quick(dice, callback) {
	var result = [];

	for (i = 0; i < dice.length; i++) {
		var parts = dice[i].split('d');

		var count = parseInt(parts[0]);
		var sides = parseInt(parts[1]);

		for (c = 0; c < count; c++) {
			var roll = Math.floor(Math.random() * sides) + 1;
			result.push(roll);
		}
	}

	callback(result);

	return true;
}

function dice_roll_parse_string(dice_input) {
	if (dice_input.indexOf('d') == -1) {
		return false;
	}

	dice_str = dice_input.replace(/ /g, '');
	dice_str = dice_str.replace(/\+-/g, '-');
	dice_str = dice_str.replace(/-/g, '+-');

	var valid_dice = [2, 4, 6, 8, 10, 12, 20, 100];
	var parts = dice_str.split('+');

	if (parts.length > 20) {
		return false;
	}

	var dice = [];
	var addition = 0;

	for (i = 0; i < parts.length; i++) {
		var roll = parts[i].split('d');
		if (roll.length > 2) {
			return false;
		} else if (roll.length == 2) {
			if (roll[0] == '') {
				parts[i] = '1' + parts[i];
				var count = 1;
			} else {
				var count = parseInt(roll[0]);
				if (isNaN(count)) {
					return false;
				}
			}

			var sides = parseInt(roll[1]);
			if (isNaN(sides)) {
				return false;
			}

			if (valid_dice.includes(sides) == false) {
				return false;
			}

			if (count > 25) {
				return false;
			}

			dice.push(parts[i]);

			if (sides == 100) {
				dice.push(count + 'd10');
			}
		} else {
			var value = parseInt(roll[0]);
			if (isNaN(value)) {
				return false
			}

			addition += value;
		}
	}

	return [ dice, addition ];
}

function roll_dice(dice_input, send_to_others = true) {
	var result = dice_roll_parse_string(dice_input);

	if (result == false) {
		return false;
	}

	var [ dice, addition ] = result;

	dice_roll(dice, function(result) {
		var message = 'Dice roll: ' + dice_input + '\n';
		var total = addition;

		result.forEach(function(roll) {
			total += roll;
		});

		message += '[' + result.join('] + [') + ']';
		if (addition > 0) {
			message += ' + ' + addition;
		} else if (addition < 0) {
			message += ' - ' + Math.abs(addition);
		}
		message += ' = ' + total;

		if (send_to_others) {
			send_message(message, character_name);
		} else {
			write_sidebar(message);
		}
	}, send_to_others);

	return true;
}

function roll_d20(bonus, type = DICE_ROLL_NORMAL) {
	if (bonus == '') {
		bonus = 0;
	} else {
		bonus = parseInt(bonus);
		if (isNaN(bonus)) {
			write_sidebar('Invalid roll bonus.');
			return false;
		}
	}

	dice = [ '1d20' ];

	if (type != DICE_ROLL_NORMAL) {
		dice.push('1d20');
	}

	dice_roll(dice, function(result) {
		var roll = result[0];

		switch (type) {
			case DICE_ROLL_ADVANTAGE:
				var message = 'Advantage d';
				break;
			case DICE_ROLL_DISADVANTAGE:
				var message = 'Disadvantage d';
				break;
			default:
				var message = 'D';
				break;
		}

		message += 'ice roll: 1d20';
		if (bonus > 0) {
			message += ' + ' + bonus;
		} else if (bonus < 0) {
			message += bonus;
		}
		message += '\n';

		if (type != DICE_ROLL_NORMAL) {
			var extra = result[1];

			message += '[' + roll + '] [' + extra + '] > ';
			if (type == DICE_ROLL_ADVANTAGE) {
				if (extra > roll) {
					roll = extra;
				}
			} else {
				if (extra < roll) {
					roll = extra;
				}
			}
			message += '[' + roll + ']';

			if ((roll == 20) && (bonus == 0)) {
				message += ' CRIT!';
			}

			message += '\n';
		}

		if ((type == DICE_ROLL_NORMAL) || (bonus != 0)) {
			message += '[' + roll + '] ';
			if (bonus != 0) {
				message += '+ ' + bonus + ' ';
			}
			message += '= ' + (roll + bonus);

			if (roll == 20) {
				message += ' CRIT!';
			}
		}

		if (dungeon_master == false) {
			send_message(message, character_name);
		} else {
			write_sidebar(message);
		}
	}, dungeon_master == false);

	return true;
}

function dice_roll_window_open() {
	wf_dice_roll.open();
}

function dice_roll_window_close() {
	wf_dice_roll.close();
}

function dice_roll_add_custom(label, callback) {
	custom_rolls.push({
		label: label,
		callback: callback
	});
}

function dice_roll_initialize(support_crit_rolls = true) {
	/* Dice roll window
	 */
	var dice_window = '<div><div class="dicerolls_defined"></div><div class="diceroll">';
	[ 4, 6, 8, 10, 12, 20 ].forEach(function(dice) {
		dice = dice.toString();
		dice_window += '<div class="dice"><img src="/images/d' + dice + '.png" title="d' + dice + '" /><select sides="' + dice + '" class="form-control">';
		for (let d = 0; d <= 20; d++) {
			dice_window += '<option>' + d.toString() + '</option>';
		}
		dice_window += '</select></div>';
	});
	dice_window += '<div class="dice"><img src="/images/plus.png" /><input type="text" class="form-control" /></div>'
	dice_window += '</div>';

	var dice_roll_get = function() {
		var roll = '';
		$('div.diceroll select').each(function() {
			var value = parseInt($(this).val());
			if (value != 0) {
				if (roll != '') {
					roll += ' + ';
				}
				roll += value + 'd' + $(this).attr('sides');
			}
		});

		if (roll == '') {
			cauldron_alert('Select at least one dice.');
			return false;
		}

		var plus = $('div.diceroll input').val();
		if (isNaN(parseInt(plus))) {
			cauldron_alert('Enter a number in the plus input field.');
			return false;
		}

		if (plus.substr(0, 1) == '-') {
			roll += plus;
		} else if (plus != '0') {
			roll += ' + ' + plus;
		}

		return roll;
	}

	var dice_roll_build = function() {
		$('div.diceroll select').each(function() {
			$(this).val('0');
		});
		$('div.diceroll input').val('0');

		var defined = $('div.dicerolls_defined');
		defined.empty();

		/* Custom rolls
		 */
		custom_rolls.forEach(function(roll) {
			var button = $('<div class="btn-group"><button class="btn btn-success">' + roll.label + '</button></div>');	
			button.on('click', function() {
				wf_dice_roll.close();
				roll.callback();
			});
			defined.append(button);
		});

		/* Saved rolls
		 */
		var rolls = localStorage.getItem('dicerolls');
		if (rolls == undefined) {
			rolls = [];
		} else {
			rolls = JSON.parse(rolls);
		}

		for ([key, value] of Object.entries(rolls)) {
			rolls[key] = {
				roll: value,
				global: true
			};
		};

		$('div.weapons div').each(function() {
			rolls[$(this).text()] = {
				roll: $(this).attr('roll'),
				global: false
			};
		});

		rolls = Object.keys(rolls).sort().reduce((accumulator, key) => {
			accumulator[key] = rolls[key];
			return accumulator;
		}, {});

		for ([key, value] of Object.entries(rolls)) {
			var roll = value['roll'];
			var global = value['global'];

			key = key.replace('"', '&quot;');

			if (global) {
				var button = $('<div class="btn-group"><input type="button" value="' + key + '" title="' + roll + '" class="btn btn-default roll" /><input type="button" value="X" class="btn btn-default remove" /></div>');
			} else {
				var button = $('<div class="btn-group"><input type="button" value="' + key + '" title="' + roll + '" class="btn btn-primary roll" /></div>');
			}

			button.find('input.roll').on('click', function() {
				wf_dice_roll.close();

				var roll = $(this).attr('title');

				if ($(this).hasClass('btn-danger')) {
					var new_roll = [];

					roll.replace(/ +/g, ' ').split('+').forEach(function(dice) {
						var parts = dice.split('d');
						if (parts.length == 2) {
							parts[0] = 2 * parseInt(parts[0]);
							dice = parts.join('d');		
						}

						new_roll.push(dice);
					});

					roll = new_roll.join(' + ');;
				}

				roll_dice(roll, dungeon_master == false);
			});

			button.find('input.remove').on('click', function() {
				if (confirm('Delete dice?')) {
					var key = $(this).parent().find('input.roll').attr('value');
					var rolls = localStorage.getItem('dicerolls');
					rolls = JSON.parse(rolls);
					delete rolls[key];
					localStorage.setItem('dicerolls', JSON.stringify(rolls));

					dice_roll_build();
				}
			});

			defined.append(button);
		};
	}

	if (support_crit_rolls) {
		var dice_roll_key_down = function(event) {
			if (event.which != KEY_CTRL) {
				return;
			}

			wf_dice_roll.find('div.dicerolls_defined input.btn-default').addClass('btn-d');
			wf_dice_roll.find('div.dicerolls_defined input.btn-primary').addClass('btn-p');
			wf_dice_roll.find('div.dicerolls_defined input.btn-default').removeClass('btn-default');
			wf_dice_roll.find('div.dicerolls_defined input.btn-primary').removeClass('btn-primary');
			wf_dice_roll.find('div.dicerolls_defined input.btn').addClass('btn-danger');
		};

		var dice_roll_key_up = function(event) {
			if (event.which != KEY_CTRL) {
				return;
			}

			wf_dice_roll.find('div.dicerolls_defined input.btn').removeClass('btn-danger');
			wf_dice_roll.find('div.dicerolls_defined input.btn-d').addClass('btn-default');
			wf_dice_roll.find('div.dicerolls_defined input.btn-p').addClass('btn-primary');
		};

		var crit_info = '<p>Hold the CTRL key to double the dice for your saved dice selections and weapons. Use this to perform a critical damage roll.</p>';
	} else {
		var crit_info = '';
	}

	wf_dice_roll = $(dice_window).windowframe({
		activator: 'button.show_dice',
		header: 'Dice roll',
		info: '<p>Use this tool to roll dice. The option \'animated\' rolls a 3D dice on the screen and shows the result in the sidebar. The option \'quick\' only shows the roll results in the sidebar.</p><p>Use the Save button to save a dice selection. They appear at the top of the dice roll window. The blue buttons represent the weapons you added to your character in the <a href="/character">Characters</a> page.</p>' + crit_info,
		width: 650,
		open: function() {
			dice_roll_build();

			if (support_crit_rolls) {
				$('body').on('keydown', dice_roll_key_down);
				$('body').on('keyup', dice_roll_key_up);
			}
		},
		close: function() {
			if (support_crit_rolls) {
				$('body').off('keydown', dice_roll_key_down);
				$('body').off('keyup', dice_roll_key_up);
			}
		},
		buttons: {
			'Roll': function() {
				$(this).close();

				var roll = dice_roll_get();
				if (roll === false) {
					return;
				}
				roll_dice(roll, dungeon_master == false);
			},
			'Save': function() {
				var roll = dice_roll_get();
				if (roll === false) {
					return;
				}

				var name = prompt('Name this dice roll:');
				if (name == null) {
					return;
				}

				if (name.trim() == '') {
					return;
				}

				var rolls = localStorage.getItem('dicerolls');
				if (rolls == undefined) {
					rolls = {};
				} else {
					rolls = JSON.parse(rolls);
				}

				rolls[name] = roll;

				localStorage.setItem('dicerolls', JSON.stringify(rolls));

				dice_roll_build();
			}
		}
	});

	if (localStorage.getItem('dice_type') == undefined) {
		localStorage.setItem('dice_type', 'animated');
	}

	wf_dice_roll.find('div.dice img').on('dblclick', function() {
		var dice = $(this).attr('title');
		if (dice == undefined) {
			return;
		}

		wf_dice_roll.close();

		roll_dice('1' + dice, dungeon_master == false);
	});

	/* Roll type selector
	 */
	if (typeof DICEBOX_INCLUDED !== 'undefined') {
		var dice_type_selector = $('<select class="form-control dice-type"><option value="quick">Quick</option><option value="animated">Animated</option></select>');
		if (localStorage.getItem('dice_type') == 'animated') {
			dice_type_selector.find('option:last-child').attr('selected', 'selected');
		}
		dice_type_selector.on('change', function() {
			localStorage.setItem('dice_type', $(this).val());
		});
		wf_dice_roll.parent().find('div.btn-group').before(dice_type_selector);
	}

	/* Custom dice
	 */
	if ($('div.custom-dice div').length > 0) {
		var custom_dice_selector = $('<select class="form-control custom-dice"><option value="-1">Roll custom dice</option></select>');

		var count = 0;
		$('div.custom-dice div').each(function() {
			custom_dice[count] = JSON.parse($(this).text());
			var sides = custom_dice[count].length;
			custom_dice_selector.append('<option value="' + count + '">' + $(this).attr('name') + ' (d' + sides + ')</option>');

			count++;
		});

		custom_dice_selector.on('change', function() {
			var dice = parseInt($(this).val());
			var name = $(this).find('option:nth-of-type(' + (dice + 2) + ')').text();

			$(this).val('-1');
			wf_dice_roll.close();

			if (dice == -1) {
				return;
			}

			var dice = custom_dice[dice];
			var side = Math.floor(Math.random() * dice.length);

			var text = dice[side];

			var message = 'Rolling ' + name + '\nResult: [' + text + ']';
			if (dungeon_master == false) {
				send_message(message, my_name);
			} else {
				write_sidebar(message);
			}
		});

		wf_dice_roll.parent().find('div.btn-group').before(custom_dice_selector);
	}
}
