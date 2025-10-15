/* Initialize game rules
 */
function game_rules_initialize() {
	rule_system_register_callback('menu_token_dm', game_rules_menu_token);
	rule_system_register_callback('context_menu_handler', game_rules_context_menu_handler);
	rule_system_register_callback('object_info', game_rules_object_info);
}

/* Pull-down menu
 */
function game_rules_menu_token(menu_entries, obj) {
}

/* Handle context menu
 */
function game_rules_context_menu_handler(key, obj) {
	return false;
}

/* Object functions
 */
function game_rules_object_info(obj) {
	var info = '';

	return info;
}
