function conditions_initialize() {
	var conditions = localStorage.getItem('conditions');

	if (conditions != undefined) {
		conditions = JSON.parse(conditions);
		for (var [key, value] of Object.entries(conditions)) {
			set_conditions($('div#' + key), value);
		}
	}
}

function conditions_websocket_message(data) {
	if (data.action == 'condition') {
		var obj = $('div#' + data.object_id);
		set_conditions(obj, data.condition);
		save_conditions(obj, data.condition);
		return true;
	}

	return false;
}

function condition_menu(menu_entries, obj) {
	var has = obj.find('span.conditions').text().split(',');
	var conditions = {};
	conditions['condition_0'] = { name: 'None' };
	conditions['sep_rs'] = '-';
	$('div.conditions div').each(function() {
		var con_id = $(this).attr('con_id');
		var name = $(this).text();
		var icon = has.includes(name) ? 'fa-check-square-o' : 'fa-square-o';
		conditions['condition_' + con_id] = { name: name, icon: icon};
	});

	menu_entries['conditions'] = { name:'Set condition', icon:'fa-heartbeat', items:conditions };

	return menu_entries;
}

function conditions_context_menu_handler(key, obj) {
    var parts = key.split('_');
    if (parts[0] == 'condition') {
        var condition_id = parts[1];

		if (condition_id > 0) {
			var condition = $('div.conditions div[con_id=' + condition_id + ']').text();
			set_condition(obj, condition);
		} else {
			set_condition(obj, null);
		}

		return true;
	}

	return false;
}

function conditions_object_info(obj) {
	var info = '';

	var conditions = obj.find('span.conditions');
	if (conditions.length > 0) {
		conditions = conditions.html().replace(/>/g, '>- ');
		info += 'Conditions:<br />- ' + conditions;
	}

	return info;
}

/* Condition functions
 */
function save_conditions(obj, condition) {
	var conditions = localStorage.getItem('conditions');
	if (conditions == undefined) {
		conditions = {};
	} else {
		conditions = JSON.parse(conditions);
	}

	var key = obj.prop('id');
	if (condition != '') {
		conditions[key] = condition;
	} else {
		delete conditions[key];
	}

	localStorage.setItem('conditions', JSON.stringify(conditions));
}

function set_conditions(obj, conditions) {
	obj.find('span.conditions').remove();

	if (conditions != '') {
		obj.append('<span class="conditions">' + conditions + '</span>');
	}
}

function set_condition(obj, condition, only_set = false) {
	var key = obj.prop('id');

	if (condition != null) {
		var conditions = $('div#' + key).find('span.conditions').text();
		if (conditions == '') {
			conditions = [];
		} else {
			conditions = conditions.replace('<br />', '');
			conditions = conditions.split(',');
		}

		if (conditions.includes(condition)) {
			if (only_set) {
				return;
			}
			conditions = conditions.remove(condition);
		} else {
			conditions.push(condition);
			conditions.sort();
		}
	} else {
		var conditions = [];
	}

	conditions = conditions.join(',<br />');
	set_conditions(obj, conditions);
	save_conditions(obj, conditions);

	var data = {
		action: 'condition',
		object_id: key,
		condition: conditions
	};
	websocket_send(data);
}
