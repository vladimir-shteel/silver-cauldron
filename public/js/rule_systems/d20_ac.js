const ATTACK_NORMAL = 0;
const ATTACK_ADVANTAGE = 1;
const ATTACK_DISADVANTAGE = 2;
const ATTACK_LABELS = [ '', 'Advantage', 'Disadvantage' ];

var wf_attack = null;

/* Pull-down menus
 */
function d20_ac_menu(menu_entries, obj) {
	menu_entries['attack'] = rs_attack_submenu;
}

/* Handle context menu
 */
function d20_ac_context_menu_handler(key, obj) {
	if (key == 'attack') {
		wf_attack.find('select').val(ATTACK_NORMAL);
		wf_attack.open(obj);
		return true;
	}

	return false;
}

/* Handle command input
 */
function d20_ac_handle_input(command, param) {
	if (command == 'spells') {
		show_spells();
		return true;
	}

	return false;
}

/* Initialize rule system
 */
function game_rules_initialize() {
	rule_system_register_callback('menu_character_dm', d20_ac_menu);
	rule_system_register_callback('menu_character_other', d20_ac_menu);
	rule_system_register_callback('menu_token_dm', d20_ac_menu);
	rule_system_register_callback('menu_token_player', d20_ac_menu);
	rule_system_register_callback('menu_token_handover', d20_ac_menu);
	rule_system_register_callback('context_menu_handler', d20_ac_context_menu_handler);
	rule_system_register_callback('handle_input', d20_ac_handle_input);

	hitpoints_temporary_enable();

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
