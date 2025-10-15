var armor_class_label = null;
var armor_class_label_lc = null;

function armor_class_initialize() {
	armor_class_label = $('div.playarea').attr('armor_class_label');
	armor_class_label_lc = armor_class_label.toLowerCase();

	rule_system_register_callback('menu_token_dm', armor_class_menu_token);
	rule_system_register_callback('context_menu_handler', armor_class_context_menu_handler);
	rule_system_register_callback('object_info', armor_class_object_info);
}

function armor_class_menu_token(menu_entries) {
	menu_entries['armor_class'] = { name:'Set ' + armor_class_label_lc, icon:'fa-shield' };
}

function armor_class_context_menu_handler(key, obj) {
	if (key == 'armor_class') {
		armor_class_set(obj);
		return true;
	}

	return false;
}

function armor_class_object_info(obj) {
	return armor_class_label + ': ' + obj.attr('armor_class') + '<br />';
}

function armor_class_set(obj) {
	var armor_class = obj.attr('armor_class');

	cauldron_prompt(armor_class_label + ':', armor_class, function(armor_class) {
		if (isNaN(armor_class)) {
			write_sidebar('Invalid ' + armor_class_label_lc + '.');
			return;
		}

		obj.attr('armor_class', armor_class);

		$.post('/object/armor_class', {
			instance_id: obj.prop('id'),
			armor_class: armor_class
		});
	});
}
