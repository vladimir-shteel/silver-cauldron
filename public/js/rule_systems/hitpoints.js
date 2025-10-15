var hitpoints_temporary_enabled = false;

/* Initialize game rules
 */
function hitpoints_initialize() {
	rule_system_register_callback('websocket_open', hitpoints_websocket_open);
	rule_system_register_callback('websocket_message', hitpoints_websocket_message);
    rule_system_register_callback('menu_character_dm', hitpoints_menu_character_dm);
	rule_system_register_callback('menu_character_mine', hitpoints_menu_character_mine);
    rule_system_register_callback('menu_token_dm', hitpoints_menu_token_dm);
	rule_system_register_callback('context_menu_handler', hitpoints_context_menu_handler);
	rule_system_register_callback('handle_input', hitpoints_handle_input);
	rule_system_register_callback('help_player', hitpoints_help_player);
	rule_system_register_callback('object_info', hitpoints_object_info);
}

function hitpoints_temporary_enable() {
	hitpoints_temporary_enabled = true;
}

/* Websocket
 */
function hitpoints_websocket_open() {
	var parts = window.location.pathname.split('/');
	if (parts.length == 4) {
		var my_char_id = $('div.playarea').attr('my_char');
		if (my_char_id != undefined) {
			object_damage_command($('div#' + my_char_id), 0);
		}
	}
}

function hitpoints_websocket_message(data) {
	switch (data.action) {
	 	case 'damage':
			var obj = $('div#' + data.instance_id);
			object_damage_action(obj, data.damage, data.perc);
			break;
		case 'maxhp':
			var obj = $('div#' + data.instance_id);
			obj.attr('hitpoints', data.points);

			if (dungeon_master) {
				write_sidebar(obj.find('span.name').text() + '\'s maximum hit points set to ' + data.points + '.');
			}
			break;
		default:
			return false;
	}

	return true;
}

/* Pull-down menus
 */
function hitpoints_menu(menu_entries) {
	menu_entries['damage'] = { name:'Damage', icon:'fa-warning' };
	menu_entries['heal'] = { name:'Heal', icon:'fa-medkit' };
}

function hitpoints_menu_character_dm(menu_entries, obj) {
	hitpoints_menu(menu_entries);
}

function hitpoints_menu_character_mine(menu_entries, obj) {
	hitpoints_menu(menu_entries);

	if (hitpoints_temporary_enabled) {
		menu_entries['temphp'] = { name:'Set temporary hit points', icon:'fa-heart-o' };
	}

	menu_entries['maxhp'] = { name:'Set maximum hit points', icon:'fa-heart' };
}

function hitpoints_menu_token_dm(menu_entries, obj) {
	var hitpoints = parseInt(obj.attr('hitpoints'));
	if (hitpoints > 0) {
		hitpoints_menu(menu_entries);
	}
}

/* Handle context menu
 */
function hitpoints_context_menu_handler(key, obj) {
	switch (key) {
		case 'damage':
			var max_hp = obj.attr('hitpoints');
			var hp_left = (parseInt(max_hp) - parseInt(obj.attr('damage'))).toString();

			cauldron_prompt('Points (max HP=' + max_hp + ', HP left=' + hp_left + '):', '', function(points) {
				points = parseInt(points);
				if (isNaN(points)) {
					write_sidebar('Invalid damage points.');
					return;
				}

				if (obj.hasClass('selected')) {
					$('div.selected').each(function() {
						object_damage_command($(this), points);
					});
				} else {
					object_damage_command(obj, points);
				}
			});
			break;
		case 'heal':
			var max_hp = obj.attr('hitpoints');
			var damage = obj.attr('damage');

			cauldron_prompt('Points (max HP=' + max_hp + ', damage=' + damage + '):', '', function(points) {
				points = parseInt(points);
				if (isNaN(points)) {
					write_sidebar('Invalid healing points.');
					return;
				}

				if (obj.hasClass('selected')) {
					$('div.selected').each(function() {
						object_damage_command($(this), -points);
					});
				} else {
					object_damage_command(obj, -points);
				}
			});
			break;
		case 'maxhp':
			if (my_character == null) {
				return;
			}

			var max_hp = my_character.attr('hitpoints');
			cauldron_prompt('Maximum hit points:', max_hp, function(points) {
				points = parseInt(points);
				if (isNaN(points)) {
					write_sidebar('Invalid hit points.');
					return;
				}

				var data = {
					action: 'maxhp',
					instance_id: my_character.prop('id'),
					points: points
				};
				websocket_send(data);

				$.post('/object/hitpoints', {
					instance_id: my_character.prop('id'),
					hitpoints: points
				});

				my_character.attr('hitpoints', points);
				object_damage_command(my_character, points - max_hp);
			});
			break;
		case 'temphp':
			cauldron_prompt('Temporary hit points:', temporary_hitpoints().toString(), function(points) {
				points = parseInt(points);
				if (isNaN(points)) {
					write_sidebar('Invalid hit points.');
					return;
				}

				temporary_hitpoints(points);
			});
			break;
		default:
			return false;
	}

	return true;
}

/* Handle command input
 */
function hitpoints_handle_input(command, param) {
	switch (command) {
		case 'damage':
			if (my_character == null) {
				break;
			}

			points = parseInt(param);
			if (isNaN(points)) {
				write_sidebar('Invalid damage points.');
				$('div.input input').val(input);
				break;
			}

			object_damage_command(my_character, points);
			break;
		case 'heal':
			if (my_character == null) {
				break;
			}

			points = parseInt(param);
			if (isNaN(points)) {
				write_sidebar('Invalid healing points');
				break;
			}

			object_damage_command(my_character, -points);
			break;
		default:
			return false;
	}

	return true;
}

/* Help information
 */
function hitpoints_help_player() {
	return {
        'damage &lt;points&gt;': 'Damage your character.',
        'heal &lt;points&gt;':   'Heal your character.'};
}

/* Object functions
 */
function hitpoints_object_info(obj) {
	var info = 'Max hit points: ' + obj.attr('hitpoints') + '<br />';

	var hitpoints = parseInt(obj.attr('hitpoints'))

	if (hitpoints > 0) {
		var remaining = hitpoints - parseInt(obj.attr('damage'));
		info +=
			'Damage: ' + obj.attr('damage') + '<br />' +
			'Hit points: ' + remaining.toString() + '<br />';
	}

	if (hitpoints_temporary_enabled && obj.is(my_character)) {
		info += 'Temp, hit points: ' + temporary_hitpoints().toString() + '<br />';
	}

	return info;
}

/* Hitpoints and damage handling
 */
function object_damage_command(obj, points) {
	var hitpoints = parseInt(obj.attr('hitpoints'));
	var damage = parseInt(obj.attr('damage'));

	if (obj.is(my_character) && (points > 0)) {
		if ((points -= temporary_hitpoints()) <= 0) {
			temporary_hitpoints(-points);
			return;
		}

		temporary_hitpoints(0);
	}

	damage += points;

	if (damage > hitpoints) {
		damage = hitpoints;
	} else if (damage < 0) {
		damage = 0;
	}

	var perc = Math.floor(100 * damage / hitpoints).toString() + '%';

	object_damage_action(obj, damage, perc);

	var data = {
		action: 'damage',
		instance_id: obj.prop('id'),
		damage: damage,
		perc: perc
	};
	websocket_send(data);

	$.post('/object/damage', {
		instance_id: obj.prop('id'),
		damage: damage
	});

	if (dungeon_master) {
		obj.attr('title', 'HP: ' + (hitpoints - damage));
	}
}

function object_damage_action(obj, damage, percentage) {
	obj.attr('damage', damage);
	obj.find('div.damage').css('width', percentage);

	if (percentage == '100%') {
		object_dead(obj);
	} else {
		object_alive(obj);
	}
}

function temporary_hitpoints(points = null) {
	var temporary_hitpoints = localStorage.getItem('temp_hp');

	if (temporary_hitpoints == undefined) {
		temporary_hitpoints = {};
	} else {
		temporary_hitpoints = JSON.parse(temporary_hitpoints);
	}

	if (temporary_hitpoints[character_id] == undefined) {
		temporary_hitpoints[character_id] = 0;
	}

	if (points !== null) {
		temporary_hitpoints[character_id] = points;
	}

	localStorage.setItem('temp_hp', JSON.stringify(temporary_hitpoints));

	if (points === null) {
		return temporary_hitpoints[character_id];
	}
}
