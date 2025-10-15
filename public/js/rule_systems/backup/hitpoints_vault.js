function hitpoints_menu_token(menu_entries) {
	menu_entries['hitpoints'] = { name:'Set hitpoints', icon:'fa-heartbeat' };
	menu_entries['damage'] = { name:'Set damage', icon:'fa-warning' };

	return menu_entries;
}

function hitpoints_context_menu_handler(key, obj) {
	switch (key) {
		case 'damage':
			object_damage_action(obj);
			break;
		case 'hitpoints':
			object_hitpoints(obj);
			break;
		default:
			return false;
	}

	return true;
}

function hitpoints_object_info(obj) {
	return 'Hitpoints: ' + obj.attr('hitpoints') + '<br />' +
	       'Damage: ' + obj.attr('damage') + '<br />';
}

function object_hitpoints(obj) {
	var hitpoints = obj.attr('hitpoints');

	cauldron_prompt('Hitpoints:', hitpoints, function(hitpoints) {
		if (isNaN(hitpoints)) {
			write_sidebar('Invalid hitpoints.');
			return;
		}

		obj.attr('hitpoints', hitpoints);

		$.post('/object/hitpoints', {
			instance_id: obj.prop('id'),
			hitpoints: hitpoints
		});
	});
}

function object_damage_action(obj) {
	var hitpoints = obj.attr('hitpoints');
	var damage = obj.attr('damage');

	cauldron_prompt('Damage (hitpoints=' + hitpoints + '):', damage, function(damage) {
		if (isNaN(damage)) {
			write_sidebar('Invalid damage.');
			return;
		}

		hitpoints = parseInt(hitpoints);
		damage = parseInt(damage);

		if (damage < 0) {
			damage = 0;
		} else if (damage > hitpoints) {
			damage = hitpoints;
		}

		obj.attr('damage', damage);

		$.post('/object/damage', {
			instance_id: obj.prop('id'),
			damage: damage
		});
	});
}

function object_damage_command(obj, points) {
	var hitpoints = parseInt(obj.attr('hitpoints'));
	var damage = parseInt(obj.attr('damage'));
	damage += points;

	if (damage > hitpoints) {
		damage = hitpoints;
	} else if (damage < 0) {
		damage = 0;
	}

	obj.attr('damage', damage);

	if (points > 0) {
		points = '+' + points.toString();
	}

	write_sidebar('Character damage:<br />' + points + ' (' + damage + '/' + hitpoints + ')');
}
