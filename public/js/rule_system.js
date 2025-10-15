const rs_attack_submenu = { name:'Attack', icon:'fa-legal' };

var rule_system_callbacks = {
	adventure_custom_value: [],
	sidebar_message_bbcode: [],
	websocket_open: [],
	websocket_message: [],
	menu_character_dm: [],
	menu_character_mine: [],
	menu_character_other: [],
	menu_token_dm: [],
	menu_token_player: [],
	menu_token_handover: [],
	menu_zone: [],
	menu_map: [],
	context_menu_handler: [],
	handle_input: [],
	help_dm: [],
	help_player: [],
	object_info: []
};

/* Initialize rule system
 */
function rule_system_initialize() {
	if (typeof hitpoints_initialize == 'function') {
		hitpoints_initialize();
	}

	if (typeof armor_class_initialize == 'function') {
		armor_class_initialize();
	}

	if (typeof combat_tracker_initialize == 'function') {
		combat_tracker_initialize();
	}

	if (typeof conditions_initialize == 'function') {
		conditions_initialize();
	}

	if (typeof spell_effect_area_initialize == 'function') {
		spell_effect_area_initialize();
	}

	if (typeof spells_initialize == 'function') {
		spells_initialize();
	}

	if (typeof game_rules_initialize == 'function') {
		game_rules_initialize();
	}
}

/* Register callback
 */
function rule_system_register_callback(type, callback) {
	if (rule_system_callbacks[type] !== 'undefined') {
		rule_system_callbacks[type].push(callback);
	}
}

/* Adventure custom value
 */
function rule_system_adventure_custom_value(key, value) {
	rule_system_callbacks.adventure_custom_value.forEach(function(callback) {
		callback(key, value);
	});
}

/* Sidebar message
 */
function rule_system_sidebar_message_bbcode(tag, content) {
	var replacement = false;

	rule_system_callbacks.sidebar_message_bbcode.every(function(callback) {
		if ((replacement = callback(tag, content)) !== false) {
			return false;
		}
	});

	return replacement;
}

/* Websocket
 */
function rule_system_websocket_open() {
	rule_system_callbacks.websocket_open.forEach(function(callback) {
		callback();
	});
}

function rule_system_websocket_message(data) {
	var result = false;

	rule_system_callbacks.websocket_message.every(function(callback) {
		if (callback(data)) {
			result = true;
			return false;
		}

		return true;
	});

	return result;
}

/* Pull-down menus
 */
function rule_system_menu_character_dm(menu_entries, obj) {
	rule_system_callbacks.menu_character_dm.forEach(function(callback) {
		callback(menu_entries, obj);
	});

	return menu_entries;
}

function rule_system_menu_character_mine(menu_entries, obj) {
	var rs_menu = {};

	rule_system_callbacks.menu_character_mine.forEach(function(callback) {
		callback(rs_menu, obj);
	});

	return Object.assign(menu_entries, rs_menu);
}

function rule_system_menu_character_other(menu_entries, obj) {
	var rs_menu = {}

	rule_system_callbacks.menu_character_other.forEach(function(callback) {
		callback(rs_menu, obj);
	});

	return Object.assign(menu_entries, rs_menu);
}

function rule_system_menu_token_dm(menu_entries, obj) {
	var rs_menu = {}

	rule_system_callbacks.menu_token_dm.forEach(function(callback) {
		callback(rs_menu, obj);
	});

	return Object.assign(menu_entries, rs_menu);
}

function rule_system_menu_token_player(menu_entries, obj) {
	var rs_menu = {}

	rule_system_callbacks.menu_token_player.forEach(function(callback) {
		callback(rs_menu, obj);
	});

	return Object.assign(menu_entries, rs_menu);
}

function rule_system_menu_token_handover(menu_entries, obj) {
	var rs_menu = {}

	rule_system_callbacks.menu_token_handover.forEach(function(callback) {
		callback(rs_menu, obj);
	});

	return Object.assign(menu_entries, rs_menu);
}

function rule_system_menu_zone(menu_entries) {
	var rs_menu = {}

	rule_system_callbacks.menu_zone.forEach(function(callback) {
		callback(rs_menu);
	});

	return Object.assign(menu_entries, rs_menu);
}

function rule_system_menu_map(menu_entries) {
	var rs_menu = {}

	rule_system_callbacks.menu_map.forEach(function(callback) {
		callback(rs_menu);
	});

	return Object.assign(menu_entries, rs_menu);
}

/* Handle context menu
 */
function rule_system_context_menu_handler(key, obj) {
	var result = false;

	rule_system_callbacks.context_menu_handler.every(function(callback) {
		if (callback(key, obj)) {
			result = true;
			return false;
		}

		return true;
	});

	return result;
}

/* Handle command input
 */
function rule_system_handle_input(command, param) {
	var result = false;

	rule_system_callbacks.handle_input.every(function(callback) {
		if (callback(command, param)) {
			result = true;
			return false;
		}

		return true;
	});

	return result;
}

/* Help information
 */
function rule_system_help_dm() {
	var help = {};

	rule_system_callbacks.help_dm.forEach(function(callback) {
		Object.assign(help, callback());
	});

	return help;
}

function rule_system_help_player() {
	var help = {};

	rule_system_callbacks.help_player.forEach(function(callback) {
		Object.assign(help, callback());
	});

	return help;
}

/* Object functions
 */
function rule_system_object_info(obj) {
	var info = '';

	rule_system_callbacks.object_info.forEach(function(callback) {
		info += callback(obj);
	});

	return info;
}

/* Token custom value
 */
function token_custom_value(label, obj, key, min_value, max_value) {
	var value = obj.attr('custom' + key);

	cauldron_prompt(label + ':', value, function(value) {
		value = parseInt(value);
		if (isNaN(value)) {
			write_sidebar('Invalid ' + label.toLowerCase() + '.');
			return;
		}

		if ((value < min_value) || (value > max_value)) {
			write_sidebar('The ' + label.toLowerCase() + ' must be between ' + min_value + ' and ' + max_value + '.');
			return;
		}

		obj.attr('custom' + key, value);

		$.post('/object/token_custom_value', {
			instance_id: obj.prop('id'),
			key: key,
			value: value
		});
	});
}
