var armor_class_label = null;
var armor_class_label_lc = null;

/* Initiailize
 */
function armor_class_initialize() {
	armor_class_label = $('div.playarea').attr('armor_class_label');
	armor_class_label_lc = armor_class_label.toLowerCase();

    rule_system_register_callback('websocket_message', armor_class_websocket_message);
	rule_system_register_callback('menu_character_mine', armor_class_menu_character_mine);
	rule_system_register_callback('context_menu_handler', armor_class_context_menu_handler);
	rule_system_register_callback('object_info', armor_class_object_info);
}

/* Websocket
 */
function armor_class_websocket_message(data) {
	if (data.action == 'armor_class') {
		var obj = $('div#' + data.instance_id);
		obj.attr('armor_class', data.points);

		if (dungeon_master) {
			write_sidebar(obj.find('span.name').text() + '\'s ' + armor_class_label_lc + ' set to ' + data.points + '.');
		}

		return true;
	}

	return false;
}

/* Menu
 */
function armor_class_menu_character_mine(menu_entries, obj) {
	menu_entries['armor_class'] = { name:'Set ' + armor_class_label_lc, icon:'fa-shield' };
}

/* Handle context menu
 */
function armor_class_context_menu_handler(key, obj) {
	if (key == 'armor_class') {
		var armor_class = obj.attr('armor_class');
		cauldron_prompt(armor_class_label + ':', armor_class, function(points) {
			points = parseInt(points);
			if (isNaN(points)) {
				write_sidebar('Invalid ' + armor_class_label_lc + '.');
				return;
			}

			var data = {
				action: 'armor_class',
				instance_id: obj.prop('id'),
				points: points
			};
			websocket_send(data);

			$.post('/object/armor_class', {
				instance_id: obj.prop('id'),
				armor_class: points
			});

			obj.attr('armor_class', points);
		});
		return true;
	}

	return false;
}

/* Object info
 */
function armor_class_object_info(obj) {
	var info = '';

	if (dungeon_master || obj.is(my_character)) {
		info += armor_class_label + ': ' + obj.attr('armor_class') + '<br />';
	}

	return info;
}
