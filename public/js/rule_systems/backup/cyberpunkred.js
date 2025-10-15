const weapon_difficulty_ranges = [
	{
		min: 0,
		max: 6
	},{
		min: 7,
		max: 12
	},{
		min: 13,
		max: 25
	},{
		min: 26,
		max: 50
	},{
		min: 51,
		max: 100
	},{
		min: 101,
		max: 200
	},{
		min: 201,
		max: 400
	},{
		min: 401,
		max: 800
	}
];

const weapon_difficulty_values = [
	{
		weapon: 'Pistol',
		values: [ 13, 15, 20, 25, 30, 30, -1, -1 ]
	},{
		weapon: 'SMG',
		values: [ 15, 13, 15, 20, 25, 25, 30, -1 ]
	},{
		weapon: 'Shotgun (Slug)',
		values: [ 13, 15, 20, 25, 30, 35, -1, -1 ]
	},{
		weapon: 'Assault Rifle',
		values: [ 17, 16, 15, 13, 15, 20, 25, 30 ]
	},{
		weapon: 'Sniper Rifle',
		values: [ 30, 25, 25, 20, 15, 16, 17, 20 ]
	},{
		weapon: 'Bow / Crossbow',
		values: [ 15, 13, 15, 17, 30, 22, -1, -1 ]
	},{
		weapon: 'Grenade Launcher',
		values: [ 16, 15, 15, 17, 20, 22, 25, -1 ]
	},{
		weapon: 'Rocket Launcher',
		values: [ 17, 16, 15, 15, 20, 20, 25, 30 ]
	}
];

function get_weapon_difficulty_value(weapon_id, range) {
	if ((weapon_id < 0) || (weapon_id > 7)) {
		return -1;
	}

	/* Cells to meters / yards.
	 */
	range *= 2;

	for (i = 0; i <= 7; i++) {
		if ((range >= weapon_difficulty_ranges[i].min) && (range <= weapon_difficulty_ranges[i].max)) {
			return weapon_difficulty_values[weapon_id].values[i];
		}
	}

	return -1;
}

/* Websocket
 */
function rule_system_websocket_open() {
	hitpoints_websocket_open();
}

function rule_system_websocket_message(data) {
	if (hitpoints_websocket_message(data)) {
		return true;
	}

	if (combat_tracker_websocket_message(data)) {
		return true;
	}

	return false;
}

/* Pull-down menus
 */
function rule_system_menu_character_dm(menu_entries, obj) {
	menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };

	hitpoints_menu(menu_entries);

	return menu_entries;
}

function rule_system_menu_character_mine(menu_entries, obj) {
	hitpoints_menu_character_mine(menu_entries);

	return menu_entries;
}

function rule_system_menu_character_other(menu_entries) {
	menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };

	return menu_entries;
}

function rule_system_menu_token_dm(menu_entries, obj) {
	var hitpoints = parseInt(obj.attr('hitpoints'));
	if (hitpoints > 0) {
		hitpoints_menu(menu_entries);
	}

	menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };

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

	if (key == 'attack') {
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

	info += combat_tracker_object_info(obj);
	info += hitpoints_object_info(obj);

	return info;
}

/* Initialize rule system
 */
function rule_system_initialize() {
	combat_tracker_set_dice_size(10);

	var attack = '<div class="attack" style="display:none">' +
	             '<div><label>Attack bonus:</label><input type="text" value="0" class="form-control"></div>' +
	             '</div>';

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

				dice_roll('1d10', function(result) {
					var roll = result[0];

					var details = 'Attack roll: [' + roll + ']';
					if (bonus > 0) {
						details += ' + ' + bonus + ' = ' + (roll + bonus);
					}
					details += '\n';

					if (dungeon_master == false) {
						message += details;
					}

					message += 'Result: ';

					if (((roll + bonus) >= armor_class) && (roll > 1)) {
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
