const ATTACK_NORMAL = 0;
const ATTACK_ADVANTAGE = 1;
const ATTACK_DISADVANTAGE = 2;
const ATTACK_LABELS = [ '', 'Advantage', 'Disadvantage' ];

var wf_attack = null;

/* Sidebar message
 */
function rule_system_sidebar_message(message) {
	if (message.substring(0, 9) == 'Casting: ') {
		var spell = message.substring(9);
		var link = spell.replace(/'/g, '\\\'').replace(/"/g, '');
		message = 'Casting <a href="javascript:show_spells(\'' + link + '\')">' + spell + '</a>';
	}

	return message;
}

function rule_system_sidebar_message_tag(tag, content) {
	if ((tag == 'spell') && (content != null)) {
		var link = content.replace(/'/g, '\\\'').replace(/"/g, '');
		return '<a href="javascript:show_spells(\'' + link + '\')">' + content + '</a>';
	}

	return false;
}

/* Websocket
 */
function rule_system_websocket_open() {
	hitpoints_websocket_open();
}

function rule_system_websocket_message(data) {
	if (armor_class_websocket_message(data)) {
		return true;
	}

	if (combat_tracker_websocket_message(data)) {
		return true;
	}

	if (conditions_websocket_message(data)) {
		return true;
	}

	if (hitpoints_websocket_message(data)) {
		return true;
	}

	switch (data.action) {
		case 'sea_circle':
			spell_effect_area_draw_circle(data.center_x, data.center_y, data.radius);
			break;
		case 'sea_cone':
			spell_effect_area_draw_cone(data.origin_x, data.origin_y, data.radius, data.angle, data.cone_angle);
			break;
		case 'sea_square':
			spell_effect_area_draw_square(data.pos_x, data.pos_y, data.range);
			break;
		case 'sea_clear':
			spell_effect_area_clear();
			break;
		default:
			return false;
	}

	return true;
}

/* Pull-down menus
 */
function rule_system_menu_character_dm(menu_entries, obj) {
	menu_entries['sea'] = sea_submenu;
	menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };

	hitpoints_menu(menu_entries);
	condition_menu(menu_entries, obj.parent());

	return menu_entries;
}

function rule_system_menu_character_mine(menu_entries, obj) {
	menu_entries['sea'] = sea_submenu;

	hitpoints_menu_character_mine(menu_entries, true);
	armor_class_menu_character_mine(menu_entries);

	menu_entries['sep_rs'] = '-';

	condition_menu(menu_entries, obj.parent());

	return menu_entries;
}

function rule_system_menu_character_other(menu_entries) {
	menu_entries['sea'] = sea_submenu;
	menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };

	return menu_entries;
}

function rule_system_menu_token_dm(menu_entries, obj) {
	menu_entries['sea'] = sea_submenu;
	menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };

	var hitpoints = parseInt(obj.attr('hitpoints'));
	if (hitpoints > 0) {
		hitpoints_menu(menu_entries);
	}

	menu_entries['armor'] = { name:'Set armor class', icon:'fa-shield' };
	menu_entries['sep_rs'] = '-';

	condition_menu(menu_entries, obj);

	return menu_entries;
}

function rule_system_menu_token_player(menu_entries) {
	menu_entries['sea'] = sea_submenu;
	menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };

	return menu_entries;
}

function rule_system_menu_token_handover(menu_entries) {
	menu_entries['sea'] = sea_submenu;
	menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };

	return menu_entries;
}

function rule_system_menu_zone(menu_entries) {
	menu_entries['sea'] = sea_submenu;

	return menu_entries;
}

function rule_system_menu_map(menu_entries) {
	menu_entries['sea'] = sea_submenu;

	return menu_entries;
}

/* Handle context menu
 */
function rule_system_context_menu_handler(key, obj) {
	if (armor_class_context_menu_handler(key, obj)) {
		return true;
	}

	if (hitpoints_context_menu_handler(key, obj)) {
		return true;
	}

	if (conditions_context_menu_handler(key, obj)) {
		return true;
	}

	if (sea_context_menu_handler(key, obj)) {
		return true;
	}

	if (key == 'attack') {
		wf_attack.find('select').val(ATTACK_NORMAL);
		wf_attack.open(obj);
		return true;
	}

	return false;
}

/* Handle command input
 */
function rule_system_handle_input(command, param) {
	if (hitpoints_handle_input(command, param)) {
		return true;
	}

	if (combat_tracker_handle_input(command, param)) {
		return true;
	}

	if (command == 'spells') {
		show_spells();
		return true;
	}

	return false;
}

/* Help information
 */
function rule_system_help_dm() {
	return combat_tracker_help();
}

function rule_system_help_player() {
	return hitpoints_help();
}

/* Object functions
 */
function rule_system_object_info(obj) {
	var info = '';

	info += armor_class_object_info(obj);
	info += combat_tracker_object_info(obj);
	info += hitpoints_object_info(obj);
	info += conditions_object_info(obj);

	return info;
}

/* Initialize rule system
 */
function rule_system_initialize() {
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
				var type = wf_attack.find('select').val();

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
					} else if (((roll + bonus) >= armor_class) && (roll > 1)) {
						message += 'hit!';
					} else {
						message += 'miss';
					}

					send_message(message, character_name);

					if (dungeon_master) {
						message = details;
						if (obj.attr('armor_class') != undefined) {
							message += armor_class_object_info(obj);
						}
						write_sidebar(message);
					}
				});
			},
			'Cancel': function() {
				wf_attack.close();
			}
		}
	});
}
