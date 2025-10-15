function rule_system_start() {
	if (typeof armor_class_initialize == 'function') {
		armor_class_initialize();
	}
	
	if (typeof combat_tracker_initialize == 'function') {
		combat_tracker_initialize();
	}

	if (typeof conditions_initialize == 'function') {
		conditions_initialize();
	}

	if (typeof spells_initialize == 'function') {
		spells_initialize();
	}

	if (typeof spell_effect_area_initialize == 'function') {
		spell_effect_area_initialize();
	}

	if (typeof rule_system_initialize == 'function') {
		rule_system_initialize();
	}
}
