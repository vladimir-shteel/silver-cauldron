const HOPE_MAX = 6;
const FEAR_MAX = 12;

const CUSTOM_STRESS = 0;
const CUSTOM_HOPE = 1;
const CUSTOM_FEAR = 0;

const ATTACK_NORMAL = 0;
const ATTACK_ADVANTAGE = 1;
const ATTACK_DISADVANTAGE = 2;
const ATTACK_LABELS = [ '', 'Advantage', 'Disadvantage' ];

function roll_hope_and_fear(type = ATTACK_NORMAL, callback = undefined) {
	if (dungeon_master) {
		return false;
	}

	var dice = [ '2d12' ];
	if (type != ATTACK_NORMAL) {
		dice.push('1d6');
	}

	dice_roll(dice, function(result) {
		var dice_hope = result[0];
		var dice_fear = result[1];

		switch (type) {
			case ATTACK_NORMAL:
				var dice_bonus = 0;
				break;
			case ATTACK_ADVANTAGE:
				var dice_bonus = result[2];
				break;
			case ATTACK_DISADVANTAGE:
				var dice_bonus = -result[2];
				break;
		}

		if (dice_hope >= dice_fear) {
			var result = "Hope";

			var instance_id = my_character.prop('id');
			var hope = character_custom_value(CUSTOM_HOPE);

			if (hope < HOPE_MAX) {
				character_custom_value_command(CUSTOM_HOPE, hope + 1);
				show_hope(hope + 1);
			}

			if (dice_hope == dice_fear) {
				var stress = character_custom_value(CUSTOM_STRESS);

				if (stress > 0) {
					character_custom_value_command(CUSTOM_STRESS, stress - 1);
				}
			}
		} else {
			var result = "Fear";

			var fear = adventure_custom_value(CUSTOM_FEAR);
			if (fear < FEAR_MAX) {
				adventure_custom_value_command(CUSTOM_FEAR, fear + 1);
			}
		}

		var total = dice_hope + dice_fear + dice_bonus;

		var message = 'Duality Dice roll: 2d12\n';
		message += '[' + dice_hope.toString() + '] + [' + dice_fear.toString() + ']';
		if (type != ATTACK_NORMAL) {
			message += ' ' + (dice_bonus >= 0 ? '+' : '-') + ' [' + Math.abs(dice_bonus.toString()) + ']';
		}
		message += ' = ' + total.toString() + ' with ' + result + '\n';
		if (dice_hope == dice_fear) {
			message += '(critical success)\n';
		}

		if (callback != undefined) {
			callback(message, total, dice_hope == dice_fear);
		} else {
			send_message(message, character_name);
		}
	});
}

function rule_system_adventure_custom_value(key, value) {
	if (key == 0) {
		show_fear(value);
	}
}

function show_hope(hope) {
	$('div.topbar div.hope').text('Hope: ' + hope.toString());
}

function show_fear(fear) {
	$('div.topbar div.fear').text('Fear: ' + fear.toString());
}

/* Websocket
 */
function rule_system_websocket_open() {
	hitpoints_websocket_open();
}

function rule_system_websocket_message(data) {
	if (conditions_websocket_message(data)) {
		return true;
	}

	if (hitpoints_websocket_message(data)) {
		return true;
	}

	return false;
}

/* Pull-down menus
 */
function rule_system_menu_character_dm(menu_entries, obj) {
	menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };

	hitpoints_menu(menu_entries);
	condition_menu(menu_entries, obj.parent());

	return menu_entries;
}

function rule_system_menu_character_mine(menu_entries, obj) {
	hitpoints_menu_character_mine(menu_entries, false);
	menu_entries['spend_hope'] = { name:'Spend hope', icon:'fa-sun-o' };

	menu_entries['sep_rs'] = '-';

	condition_menu(menu_entries, obj.parent());

	return menu_entries;
}

function rule_system_menu_character_other(menu_entries) {
	menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };

	return menu_entries;
}

function rule_system_menu_token_dm(menu_entries, obj) {
	menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };

	var hitpoints = parseInt(obj.attr('hitpoints'));
	if (hitpoints > 0) {
		hitpoints_menu(menu_entries);
	}

	menu_entries['sep_rs'] = '-';

	condition_menu(menu_entries, obj);

	return menu_entries;
}

function rule_system_menu_token_player(menu_entries) {
	menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };

	return menu_entries;
}

function rule_system_menu_token_handover(menu_entries) {
	menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };

	return menu_entries;
}

/* Handle context menu
 */
function rule_system_context_menu_handler(key, obj) {
	if (hitpoints_context_menu_handler(key, obj)) {
		return true;
	}

	if (conditions_context_menu_handler(key, obj)) {
		return true;
	}

	switch (key) {
		case 'attack':
			wf_attack.find('select').val(ATTACK_NORMAL);
			wf_attack.open(obj);
			break;
		case 'spend_hope':
			var hope = character_custom_value(CUSTOM_HOPE);
			if (hope > 0) {
				character_custom_value_command(CUSTOM_HOPE, hope - 1);
				show_hope(hope - 1);
				send_message(my_name + ' spent a hope.');
			}
			break;
		default:
			return false;
	}

	return true;
}

/* Handle command input
 */
function rule_system_handle_input(command, param) {
	if (hitpoints_handle_input(command, param)) {
		return true;
	}

	return false;
}

/* Object functions
 */
function rule_system_object_info(obj) {
	var info = '';

	if (obj.hasClass('character')) {
		info += armor_class_object_info(obj);
	} else {
		info += 'Difficulty: ' + obj.attr('armor_class') + '<br />';
	}

	info += hitpoints_object_info(obj, false);
	info += conditions_object_info(obj);

	if (obj.hasClass('character')) {
		var stress = character_custom_value(CUSTOM_STRESS, obj);
		var hope = character_custom_value(CUSTOM_HOPE, obj);

		info += 'Stress: ' + stress + '<br />';
		info += 'Hope: ' + hope + '<br />';
	}

	return info;
}

/* Initialize rule system
 */
function rule_system_initialize() {
	var fear = $('div.playarea').attr('custom' + CUSTOM_FEAR.toString());
	$('div.topbar').prepend('<div class="fear"></div>');
	show_fear(fear);

	if (dungeon_master == false) {
		var hope = my_character.attr('custom' + CUSTOM_HOPE.toString());
		$('div.topbar').prepend('<div class="hope"></div>');
		show_hope(hope);
	}

	if (dungeon_master) {
		$('div.menu button.pictures').after('<button class="btn btn-default btn-sm spend_fear">Spend fear</button>');

		$('div.menu button.spend_fear').on('click', function() {
			$('div.menu').hide();

			var fear = adventure_custom_value(CUSTOM_FEAR);

			if (fear > 0) {
				adventure_custom_value_command(CUSTOM_FEAR, fear - 1);
				send_message('The Game Master spent a fear.');
			}
		});
	} else {
		dice_roll_add_custom('Duality Dice', function() {
			roll_hope_and_fear();
		});
	}

	var attack = '<div class="attack" style="display:none">' +
	             '<div><label>Attack bonus:</label><input type="text" value="0" class="form-control"></div>' +
	             '<div><label>Attack type:</label><select class="form-control">' +
	             '<option value="' + ATTACK_NORMAL + '">Normal</option>' +
	             '<option value="' + ATTACK_ADVANTAGE + '">Advantage</option>' +
	             '<option value="' + ATTACK_DISADVANTAGE + '">Disadvantage</option>' +
	             '</select></div></div>';

	wf_attack = $(attack).windowframe({
		width: 500,
		header: 'Attack',
		info: '<p>Use this tool to make a d20 attack roll against the selected creature. The result will be shown in the sidebar.</p><p>An advantage roll uses the highest score of two d20 dice rolls. A disadvantage roll uses the lowest score of two d20 dice rolls.</p><p>The attack roll is compared to the selected creature\'s armor class. The result is also shown in the sidebar.</p>',
		open: function() {
			var input = wf_attack.find('input');
			var length = input.val().length;
			input.focus();
			input[0].setSelectionRange(length, length);
		},
		buttons: {
			'Ok': function() {
				var bonus = parseInt(wf_attack.find('input').val());
				wf_attack.close();

				if (isNaN(bonus)) {
					write_sidebar('Invalid attack bonus.');
					return;
				}

				var obj = wf_attack.parent().parent().data('param');
				var armor_class = parseInt(obj.attr('armor_class'));
				var message = 'Target: ' + object_target_link(obj) + '\n';
				var type = parseInt(wf_attack.find('select').val());

				if (dungeon_master) {
					/* Attack by Game Master
					 */
					var dice = [ '1d20' ];
					if (type != ATTACK_NORMAL) {
						dice.push('1d20');
					}

					dice_roll(dice, function(result) {
						var roll = result[0];

						if (type == ATTACK_ADVANTAGE) {
							if (result[1] > roll) {
								roll = result[1];
							}
						} else if (type == ATTACK_DISADVANTAGE) {
							if (result[1] < roll) {
								roll = result[1];
							}
						}

						var details = '';
						if (type != ATTACK_NORMAL) {
							details += ATTACK_LABELS[type] + ': [' + result[0] + '] [' + result[1] + '] > [' + roll + ']\n';
						}
						details += 'Attack roll: [' + roll + ']';
						if (bonus > 0) {
							details += ' + ' + bonus + ' = ' + (roll + bonus);
						}
						details += '\n';

						if (dungeon_master == false) {
							message += details;
						}

						message += 'Result: ';

						if (roll == 20) {
							message += 'CRIT!';
						} else if ((roll + bonus >= armor_class) && (roll > 1)) {
							message += 'hit!';
						} else {
							message += 'miss';
						}

						send_message(message, character_name);

						message = details;
						if (obj.attr('armor_class') != undefined) {
							message += armor_class_object_info(obj);
						}
						write_sidebar(message);
					});
				} else {
					/* Attack by player
					 */
					roll_hope_and_fear(type, function(message, roll, critical_success) {
						message += 'Result: ';

						if ((roll + bonus >= armor_class) || critical_success) {
							message += 'hit!';
						} else {
							message += 'miss';
						}

						send_message(message, character_name);
					});
				}
			},
			'Cancel': function() {
				wf_attack.close();
			}
		}
	});
}
