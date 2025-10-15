var wf_stats = null;

/* Initialize game rules
 */
function game_rules_initialize() {
	rule_system_register_callback('menu_token_dm', cyberpunk_red_menu_token);
	rule_system_register_callback('context_menu_handler', cyberpunk_red_context_menu_handler);
	rule_system_register_callback('object_info', cyberpunk_red_object_info);

	var stats = '<div class="stats" instance="">' +
	            '<label>Hitpoints:</label>' +
	            '<input id="hitpoints" type="text" value="" class="form-control" />' +
	            '<label>Evasion:</label>' +
	            '<input id="evasion" type="text" value="" class="form-control" />' +
	            '<label>Reflexes:</label>' +
	            '<input id="reflexes" type="text" value="" class="form-control" />' +
	            '<label>Dexterity:</label>' +
	            '<input id="dexterity" type="text" value="" class="form-control" />' +
	            '</div>';

	wf_stats = $(stats).windowframe({
		width: 500,
		header: 'Statistics',
		open: function() {
			var input = wf_stats.find('input').first();
			var length = input.val().length;
			input.focus();
			input[0].setSelectionRange(length, length);
		},
		buttons: {
			'Ok': function() {
				$.post('/rs/cyberpunkred/save_stats', {
					instance_id: wf_stats.attr('instance'),
					hitpoints: wf_stats.find('input').eq(0).val(),
					evasion: wf_stats.find('input').eq(1).val(),
					reflexes: wf_stats.find('input').eq(2).val(),
					dexterity: wf_stats.find('input').eq(3).val()
				});

				wf_stats.close();
			},
			'Cancel': function() {
				wf_stats.close();
			}
		}
	});

}

/* Pull-down menu
 */
function cyberpunk_red_menu_token(menu_entries, obj) {
	delete menu_entries['hitpoints'];
	delete menu_entries['armor_class'];

	menu_entries['stats'] = { name:'Set statistics', icon:'fa-list-ul' };
}

/* Handle context menu
 */
function cyberpunk_red_context_menu_handler(key, obj) {
	switch (key) {
		case 'reflexes':
			token_custom_value('Reflexes', obj, 0, 0, 20);
			break;
		case 'dexterity':
			token_custom_value('Dexterity', obj, 1, 0, 20);
			break;
		case 'stats':
			wf_stats.attr('instance', obj.prop('id'));
			wf_stats.find('input').eq(0).val(obj.attr('hitpoints'));
			wf_stats.find('input').eq(1).val(obj.attr('armor_class'));
			wf_stats.find('input').eq(2).val(obj.attr('custom0'));
			wf_stats.find('input').eq(3).val(obj.attr('custom1'));

			wf_stats.open();
			break;
		default:
			return false;
	}

	return true;
}

/* Object functions
 */
function cyberpunk_red_object_info(obj) {
	var info = '';

	info += 'Reflexes: ' + obj.attr('custom0') + '<br />';
	info += 'Dexterity: ' + obj.attr('custom1') + '<br />';

	return info;
}
