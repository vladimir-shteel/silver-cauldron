/* Handle context menu
 */
function rule_system_context_menu_handler(key, obj) {
    if (armor_class_context_menu_handler(key, obj)) {
        return true;
    }

    if (hitpoints_context_menu_handler(key, obj)) {
        return true;
    }

	return false;
}

/* Pull-down menu
 */
function rule_system_menu_token(menu_entries) {
	menu_entries = armor_class_menu_token(menu_entries);
	menu_entries = hitpoints_menu_token(menu_entries);

	return menu_entries;
}

/* Object info
 */
function rule_system_object_info(obj) {
	return armor_class_object_info(obj) + hitpoints_object_info(obj);
}

/* Initialize rule system
 */
function rule_system_initialize() {
	armor_class_label = 'Difficulty';
	armor_class_label_lc = 'difficulty';
}
