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

const cpr_weapon_melee = -1;
const cpr_weapon_martial_arts = -2;

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

/* Pull-down menus
 */
function cyberpunk_red_menu(menu_entries, obj) {
	menu_entries['attack'] = rs_attack_submenu;
}

/* Handle context menu
 */
function cyberpunk_red_context_menu_handler(key, obj) {
	if (key == 'attack') {
		if (dungeon_master) {
			if (focus_obj == null) {
				write_sidebar('Select the attacker first by double-clicking it.');
				return true;
			} else if (focus_obj.is(obj)) {
				write_sidebar('Attacking yourself makes no sense.');
				return true;
			}
		}

		wf_attack.open(obj);
		return true;
	}

	return false;
}

/* Object functions
 */
function cyberpunk_red_object_info(obj) {
	var info = '';

	info += 'Reflexes: ' + obj.attr('custom0') + '<br />';
	info += 'Dexterity: ' + obj.attr('custom1') + '<br />';

	return info;
}

function cyberpunk_red_stats(obj) {
	var stats = {};

	if (obj.hasClass('character')) {
		stats.evasion = parseInt(obj.attr('armor_class'));
		stats.reflexes = parseInt(obj.attr('initiative'));
		stats.dexterity = parseInt(obj.attr('custom0'));
	} else if (obj.hasClass('token')) {
		stats.evasion = parseInt(obj.attr('armor_class'));
		stats.reflexes = parseInt(obj.attr('custom0'));
		stats.dexterity = parseInt(obj.attr('custom1'));
	} else {
		return false;
	}

	return stats;
}

function roll_1d10_dice() {
	return Math.floor(Math.random() * 10) + 1;
}

function roll_extra(roll, total, text) {
	if ((roll == 1) || (roll == 10)) {
		var extra = roll_1d10_dice();

		if (roll == 1) {
			total -= extra;
			text += '-';
		} else {
			total += extra;
			text += '+';
		}

		text += ' [' + extra.toString() + '] ';
	}

	return [ total, text ];
}

/* Initialize rule system
 */
function game_rules_initialize() {
    rule_system_register_callback('menu_character_dm', cyberpunk_red_menu);
    rule_system_register_callback('menu_character_other', cyberpunk_red_menu);
    rule_system_register_callback('menu_token_dm', cyberpunk_red_menu);
    rule_system_register_callback('menu_token_player', cyberpunk_red_menu);
    rule_system_register_callback('menu_token_handover', cyberpunk_red_menu);
    rule_system_register_callback('context_menu_handler', cyberpunk_red_context_menu_handler);
	rule_system_register_callback('object_info', cyberpunk_red_object_info);

	combat_tracker_set_dice_size(10);

	var weapons = '<div class="form-group"><label>Weapon:</label><select class="form-control cpr_weapons">';
	var wid = 0;
	weapon_difficulty_values.forEach(function(weapon) {
		weapons += '<option value="' + (wid++) + '">' + weapon.weapon + '</option>';
	});
	weapons += '<option value="' + cpr_weapon_melee + '">Melee</option>';
	weapons += '<option value="' + cpr_weapon_martial_arts + '">Martial Arts</option>';
	weapons += '</select></div>';

	var attack = '<div class="attack">' +
	             '<div class="form-group"><label>Weapon / attack skill:</label><input type="text" value="0" class="form-control" /></div>' +
				 weapons +
				 '<div class="row"><div class="col-xs-6">' +
	             '<div class="form-group"><label>Evasion check:</label><input type="checkbox" name="evasion" /></div>' +
				 '</div><div class="col-xs-6">' +
	             '<div class="form-group"><label>Aimed shot:</label><input type="checkbox" name="evasion" /></div>' +
				 '</div></div></div>';

	wf_attack = $(attack).windowframe({
		width: 500,
		header: 'Attack',
		open: function() {
			var aimed = wf_attack.find('input').eq(2);
			aimed.prop('checked', false);

			var input = wf_attack.find('input').first();
			var length = input.val().length;
			input.focus();
			input[0].setSelectionRange(length, length);
		},
		buttons: {
			'Ok': function() {
				var skill = parseInt(wf_attack.find('input').first().val());
				var weapon = parseInt(wf_attack.find('select').val());
				var evasion = wf_attack.find('input').eq(1).is(':checked');
				var aimed = wf_attack.find('input').eq(2).is(':checked');

				wf_attack.close();

				if (isNaN(skill)) {
					write_sidebar('Invalid weapon / attack skill.');
					return;
				}

				if (dungeon_master == false) {
					var attacker = my_character;
				} else if (focus_obj != null) {
					var attacker = focus_obj;
				} else {
					write_sidebar('Focus on attacker was lost.');
					return;
				}

				var defender = wf_attack.parent().parent().data('param');

				var attacker_stats = cyberpunk_red_stats(attacker);
				var defender_stats = cyberpunk_red_stats(defender);

				var message = '';
				if (dungeon_master) {
					message += 'Attacker: ' + object_target_link(attacker) + '\n';
				}

				dice_roll('1d10', function(result) {
					var roll = result[0];

					var attack_stat = (weapon >= 0) ? attacker_stats.reflexes : attacker_stats.dexterity;

					if (weapon >= 0) {
						var weapon_name = weapon_difficulty_values[weapon].weapon;
					} else if (weapon == -1) {
						var weapon_name = 'Melee';
					} else if (weapon == -2) {
						var weapon_name = 'Martial Arts';
					} else {
						return;
					}

					message += 'Attacking with ' + weapon_name + '.\n';
					message += 'Target: ' + object_target_link(defender) + '\n';

					var attack_value = attack_stat + skill + roll;

					var details = 'A' + (aimed ? 'imed a' : '') + 'ttack roll: ' + attack_stat + ' + ' + skill;
					if (aimed) {
						details += ' - 8';
						attack_value -= 8;
					}
					details += ' + [' + roll + '] ';
					[ attack_value, details ] = roll_extra(roll, attack_value, details);
					details += '= ' + attack_value + '\n';

					if (dungeon_master == false) {
						message += details;
					}

					if (evasion || (weapon == -1)) {
						var dice = roll_1d10_dice();
						var defend_value = defender_stats.dexterity + defender_stats.evasion + dice;

						message += 'DV: ' + defender_stats.dexterity + ' + ' + defender_stats.evasion + ' + [' + dice + '] ';
						[ defend_value, message ] = roll_extra(dice, defend_value, message);
						message += '= ' + defend_value + '\n';
					} else if (weapon >= 0) {
						var a_pos = object_position(attacker);
						var d_pos = object_position(defender);
						var range = Math.round(Math.max(Math.abs(a_pos.top - d_pos.top), Math.abs(a_pos.left - d_pos.left)) / grid_cell_size);

						var defend_value = get_weapon_difficulty_value(weapon, range);
						if (defend_value == -1) {
							write_sidebar('Range fault.');
							return;
						}

						message += 'Range: ' + (range * 2) + ' m/yds\n';
						message += 'DV: ' + defend_value + '\n';
					} else if (weapon == -2) {
						var defend_value = null;
					} else {
						write_sidebar('Weapon fault.');
						return;
					}

					if (defend_value !== null) {
						message += 'Result: ' + ((attack_value > defend_value) ? 'hit!' : 'miss') + '\n';
					}

					send_message(message, character_name);

					if (dungeon_master) {
						write_sidebar(details);
					}
				});
			},
			'Cancel': function() {
				wf_attack.close();
			}
		}
	});

	$('select.cpr_weapons').on('change', function() {
		var weapon = parseInt(wf_attack.find('select').val());
		var evasion_checkbox = wf_attack.find('div.form-group').eq(2);
		var aimed_checkbox = wf_attack.find('div.form-group').eq(3);

		if (weapon == -1) {
			evasion_checkbox.hide();
		} else {
			evasion_checkbox.show();

			if (weapon == -2) {
				evasion_checkbox.find('input').prop('checked', true);
			}
		}

		if (weapon < 0) {
			aimed_checkbox.hide();
		} else {
			aimed_checkbox.show();
		}
	});
}
