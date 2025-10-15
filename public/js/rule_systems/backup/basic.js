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
	hitpoints_menu(menu_entries);

	return menu_entries;
}

function rule_system_menu_character_mine(menu_entries, obj) {
	hitpoints_menu_character_mine(menu_entries);

	return menu_entries;
}

function rule_system_menu_token_dm(menu_entries, obj) {
	var hitpoints = parseInt(obj.attr('hitpoints'));
	if (hitpoints > 0) {
		hitpoints_menu(menu_entries);
	}

	return menu_entries;
}

/* Handle context menu
 */
function rule_system_context_menu_handler(key, obj) {
	if (hitpoints_context_menu_handler(key, obj)) {
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
