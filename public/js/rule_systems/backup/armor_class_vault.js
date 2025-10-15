var armor_class_label = null;
var armor_class_label_lc = null;

/* Initiailize
 */
function armor_class_initialize() {
	armor_class_label = $('div.playarea').attr('armor_class_label');
	armor_class_label_lc = armor_class_label.toLowerCase();
}

function armor_class_menu_token(menu_entries) {
	menu_entries['armor_class'] = { name:'Set ' + armor_class_label_lc, icon:'fa-shield' };

	return menu_entries;
}

function armor_class_context_menu_handler(key, obj) {
	if (key == 'armor_class') {
		object_armor_class(obj);
		return true;
	}

	return false;
}

function armor_class_object_info(obj) {
	return armor_class_label + ': ' + obj.attr('armor_class') + '<br />';
}

function object_armor_class(obj) {
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
