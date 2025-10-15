/* Initialize game rules
 */
function game_rules_initialize() {
	rule_system_register_callback('websocket_open', game_rules_websocket_open);
	rule_system_register_callback('websocket_message', game_rules_websocket_message);
	rule_system_register_callback('menu_character_dm', game_rules_menu_character_dm);
	rule_system_register_callback('menu_character_mine', game_rules_menu_character_mine);
	rule_system_register_callback('menu_character_other', game_rules_menu_character_other);
	rule_system_register_callback('menu_token_dm', game_rules_menu_token_dm);
	rule_system_register_callback('menu_token_player', game_rules_menu_token_player);
	rule_system_register_callback('menu_token_handover', game_rules_menu_token_handover);
	rule_system_register_callback('menu_zone', game_rules_menu_zone);
	rule_system_register_callback('menu_map', game_rules_menu_map);
	rule_system_register_callback('context_menu_handler', game_rules_context_menu_handler);
	rule_system_register_callback('handle_input', game_rules_handle_input);
	rule_system_register_callback('help_dm', game_rules_help_dm);
	rule_system_register_callback('help_player', game_rules_help_player);
	rule_system_register_callback('object_info', game_rules_object_info);
}

/* Websocket
 */
function game_rules_websocket_open() {
}

function game_rules_websocket_message(data) {
	switch (data.action) {
		default:
			return false;
	}

	return true;
}

/* Pull-down menus
 */
function game_rules_menu_character_dm(menu_entries, obj) {
}

function game_rules_menu_character_mine(menu_entries, obj) {
}

function game_rules_menu_character_other(menu_entries, obj) {
}

function game_rules_menu_token_dm(menu_entries, obj) {
}

function game_rules_menu_token_player(menu_entries, obj) {
}

function game_rules_menu_token_handover(menu_entries, obj) {
}

function game_rules_menu_zone(menu_entries) {
}

function game_rules_menu_map(menu_entries) {
}

/* Handle context menu
 */
function game_rules_context_menu_handler(key, obj) {
	return false;
}

/* Handle command input
 */
function game_rules_handle_input(command, param) {
	return false;
}

/* Help information
 */
function game_rules_help_dm() {
	var help = {};

	return help;
}

function game_rules_help_player() {
	var help = {};

	return help;
}

/* Object functions
 */
function game_rules_object_info(obj) {
	var info = '';

	return info;
}
