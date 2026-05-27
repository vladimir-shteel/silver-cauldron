
/* Effects
 */
function effect_create_object(effect_id, src, pos_x, pos_y, width, height) {
	width *= grid_cell_size;
	height *= grid_cell_size;

	var effect = $('<div id="' + effect_id +'" class="effect" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; width:' + width + 'px; height:' + height + 'px; z-index:' + LAYER_EFFECT + ';"><img src="' + src + '" style="width:100%; height:100%;" draggable="false" /></div>');

	$('div.playarea div.effects').append(effect);
}

function effect_create(template) {
	wf_effect_create.close();

	var src = $(template).prop('src');

	var width = parseInt($('input#effect_width').val());
	if (width == undefined) {
		write_sidebar('Invalid effect width.');
		return;
	}
	if ((width < 1) || (width > 50)) {
		write_sidebar('Invalid effect width.');
		return;
	}

	var height = parseInt($('input#effect_height').val());
	if (height == undefined) {
		write_sidebar('Invalid effect height.');
		return;
	}
	if ((height < 1) || (height > 50)) {
		write_sidebar('Invalid effect height.');
		return;
	}

	var effect_id = effect_counter + '_' + map_id;
	effect_create_object(effect_id, src, effect_x, effect_y, width, height);
	effect_create_final(effect_id, src, width, height);
	effect_counter++;
}

function effect_create_final(effect_id, src, width, height) {
	var data = {
		action: 'effect_create',
		instance_id: effect_id,
		src: src,
		pos_x: effect_x,
		pos_y: effect_y,
		width: width,
		height: height
	};
	websocket_send(data);

	$('div#' + effect_id).draggable({
		containment: 'div.playarea > div',
		drag: draggable_drag_correction,
		stop: function(event, ui) {
			object_move($(this));
		}
	});

	$('div#' + effect_id).on('contextmenu', function(event) {
		var menu_entries = {
			'handover': { name:'Hand over', icon:'fa-hand-stop-o' },
			'takeback': { name:'Take back', icon:'fa-hand-grab-o' },
			'sep1': '-',
			'marker': { name:'Set marker', icon:'fa-map-marker' },
			'distance': { name:'Measure distance', icon:'fa-map-signs' },
			'coordinates': { name:'Get coordinates', icon:'fa-flag' },
			'sep2': '-',
			'effect_duplicate': { name:'Duplicate', icon:'fa-copy' },
			'effect_delete': { name:'Delete', icon:'fa-trash' }
		};

		context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
		return false;
	});
}

/* Measuring functions
 */
function measuring_stop() {
	$('div.playarea').off('mousemove');
	$('div.playarea').off('click');
	$('div.playarea').on('click', playarea_click);

	$('div.ruler').remove();

	$('p.measure').text('Distance: ' + $('p.measure').text());
	$('p.measure').removeClass('measure');
}

/* Door functions
 */
function door_position(door) {
	var pos_x = parseInt(door.attr('pos_x')) * grid_cell_size;
	var pos_y = parseInt(door.attr('pos_y')) * grid_cell_size;
	var length = parseInt(door.attr('length')) * grid_cell_size;
	var direction = door.attr('direction');

	if (direction == 'horizontal') {
		var width = length;
		var height = 9;
		pos_y -= 4;
	} else if (direction == 'vertical') {
		var width = 9;
		var height = length;
		pos_x -= 4;
	} else {
		write_sidebar('Invalid door!');
		return;
	}

	door.css('left', pos_x + 'px');
	door.css('top', pos_y + 'px');
	door.css('width', width + 'px');
	door.css('height', height + 'px');

	if (door.attr('secret') == 'yes') {
		if (dungeon_master) {
			door.css('background-color', DOOR_SECRET);
		} else {
			door.hide();
		}
	}

	if (door.attr('state') == 'open') {
		door_show_open(door);
	}

	if (door.attr('bars') == 'yes') {
		if (direction == 'horizontal') {
			door.css('background-image', 'repeating-linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0) 5px, #000000 5px, #000000 10px)');
		} else {
			door.css('background-image', 'repeating-linear-gradient(0deg, rgba(0,0,0,0), rgba(0,0,0,0) 5px, #000000 5px, #000000 10px)');
		}
	}
}

function door_collision(x1, y1, x2, y2) {
	var x = ((x1 + 0.5) + (x2 + 0.5)) / 2;
	var y = ((y1 + 0.5) + (y2 + 0.5)) / 2;
	var result = false;

	$('div.door').each(function() {
		if ($(this).attr('state') == 'open') {
			return;
		}

		var direction = $(this).attr('direction');

		if (direction == 'horizontal') {
			var wx1 = parseInt($(this).attr('pos_x'));
			var wx2 = wx1 + parseInt($(this).attr('length'));
			var wy = parseInt($(this).attr('pos_y'));

			if ((y == wy) && (x >= wx1) && (x <= wx2)) {
				result = true;
				return false;
			}
		} else if (direction == 'vertical') {
			var wx = parseInt($(this).attr('pos_x'));
			var wy1 = parseInt($(this).attr('pos_y'));
			var wy2 = wy1 + parseInt($(this).attr('length'));

			if ((x == wx) && (y >= wy1) && (y <= wy2)) {
				result = true;
				return false;
			}
		}
	});

	return result;
}

function door_send_state(door) {
	var data = {
		action: 'door_state',
		door_id: door.prop('id'),
		state: door.attr('state')
	};
	websocket_send(data);

	$.post('/object/door_state', {
		door_id: door.prop('id').substring(4),
		state: door.attr('state')
	});
}

function door_make_closed(door) {
	if (door.attr('state') != 'open') {
		return;
	}

	door_show_closed(door);
	door_send_state(door);
}

function door_make_open(door) {
	if (door.attr('state') == 'open') {
		return;
	}

	door_show_open(door);
	door_send_state(door);
}

function door_show_closed(door) {
	door.attr('state', 'closed');

	door.css('opacity', '1');
	if (dungeon_master) {
		door.css('background-color', door.attr('secret') == 'yes' ? DOOR_SECRET : '');
	} else if (door.attr('secret') == 'no') {
		door.show();
	}
	door.css('opacity', DOOR_OPACITY);

	/* Fog of War
	 */
	if (my_character != null) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function door_show_open(door) {
	door.attr('state', 'open');

	if (dungeon_master) {
		door.css('background-color', DOOR_OPEN);
		door.css('opacity', DOOR_OPACITY);
	} else {
		door.hide();
	}

	/* Fog of War
	 */
	if (my_character != null) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

/* Light functions
 */
function light_create_object(instance_id, pos_x, pos_y, radius) {
	var light = '<div id="light' + instance_id + '" src="/images/light_on.png" class="light" radius="' + radius + '" title="Radius: ' + radius + '" state="on" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px; z-index:' + LAYER_LIGHT + '">';
	if (dungeon_master) {
		light += '<img src="/images/light_on.png" style="width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px" />';
	}
	light += '</div>';

	$('div.playarea div.lights').append(light);

	/* Fog of War
	 */
	if (my_character != null) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function light_create(pos_x, pos_y, radius) {
	$.post('/object/create_light', {
		map_id: map_id,
		pos_x: Math.round(pos_x / grid_cell_size),
		pos_y: Math.round(pos_y / grid_cell_size),
		radius: radius
	}).done(function(data) {
		instance_id = $(data).find('instance_id').text();

		light_create_object(instance_id, pos_x, pos_y, radius);

		var data = {
			action: 'light_create',
			instance_id: instance_id,
			pos_x: pos_x,
			pos_y: pos_y,
			radius: radius
		};
		websocket_send(data);

		$('div#light' + instance_id).draggable({
			containment: 'div.playarea > div',
			drag: draggable_drag_correction,
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		$('div#light' + instance_id).on('dblclick', function(event) {
			light_toggle($(this));
			event.stopPropagation();
		});

		$('div#light' + instance_id).on('contextmenu', function(event) {
			var menu_entries = {};

			if ($(this).attr('state') == 'on') {
				menu_entries['light_toggle'] = { name:'Turn off', icon:'fa-toggle-off' };
			} else {
				menu_entries['light_toggle'] = { name:'Turn on', icon:'fa-toggle-on' };
			}

			menu_entries['light_delete'] = { name:'Delete', icon:'fa-trash' };

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});
	}).fail(function(data) {
		cauldron_alert('Light create error');
	});
}

function light_radius(obj, radius) {
	obj.attr('light', radius);

	if (my_character != null) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function light_state(obj, state) {
	obj.attr('state', state);
	obj.find('img').attr('src', '/images/light_' + state + '.png');

	if (my_character != null) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function light_toggle(light) {
	var toggle = { on:'off', off:'on' };
	var state = toggle[light.attr('state')];

	light_state(light, state);

	var light_id = light.prop('id').substring(5);

	$.post('/object/light_state', {
		light_id: light_id,
		state: state
	});

	var data = {
		action: 'light_state',
		light_id: light_id,
		state: state
	};
	websocket_send(data);
}

function light_delete(obj) {
	obj.remove();

	if (my_character != null) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

/* Wall functions
 */
function wall_position(wall) {
	var pos_x = parseInt(wall.attr('pos_x')) * grid_cell_size;
	var pos_y = parseInt(wall.attr('pos_y')) * grid_cell_size;
	var length = parseInt(wall.attr('length')) * grid_cell_size;
	var direction = wall.attr('direction');

	if (direction == 'horizontal') {
		var width = length;
		var height = 5;
		pos_y -= 2;
	} else if (direction == 'vertical') {
		var width = 5;
		var height = length;
		pos_x -= 2;
	} else {
		write_sidebar('Invalid wall!');
		return;
	}

	if (dungeon_master == false) {
		wall.css('display', 'none');
	}

	wall.css('left', pos_x + 'px');
	wall.css('top', pos_y + 'px');
	wall.css('width', width + 'px');
	wall.css('height', height + 'px');
}

function wall_collision(x1, y1, x2, y2) {
	var x = ((x1 + 0.5) + (x2 + 0.5)) / 2;
	var y = ((y1 + 0.5) + (y2 + 0.5)) / 2;
	var result = false;

	$('div.wall').each(function() {
		var direction = $(this).attr('direction');

		if (direction == 'horizontal') {
			var wx1 = parseInt($(this).attr('pos_x'));
			var wx2 = wx1 + parseInt($(this).attr('length'));
			var wy = parseInt($(this).attr('pos_y'));

			if ((y == wy) && (x >= wx1) && (x <= wx2)) {
				result = true;
				return false;
			}
		} else if (direction == 'vertical') {
			var wx = parseInt($(this).attr('pos_x'));
			var wy1 = parseInt($(this).attr('pos_y'));
			var wy2 = wy1 + parseInt($(this).attr('length'));

			if ((x == wx) && (y >= wy1) && (y <= wy2)) {
				result = true;
				return false;
			}
		}
	});

	return result;
}

/* Window functions
 */
function window_make_closed(wind) {
	if (wind.attr('transparent') != 'yes') {
		return;
	}

	window_show_closed(wind);
	window_send_state(wind);
}

function window_show_closed(wind) {
	wind.attr('transparent', 'no');

	wind.css('background-color', '#0000a0');

	/* Fog of War
	 */
	if (my_character != null) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function window_make_open(wind) {
	if (wind.attr('transparent') != 'no') {
		return;
	}

	window_show_open(wind);
	window_send_state(wind);
}

function window_show_open(wind) {
	wind.attr('transparent', 'yes');

	wind.css('background-color', '');

	/* Fog of War
	 */
	if (my_character != null) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function window_send_state(wind) {
	var data = {
		action: 'window_state',
		window_id: wind.prop('id'),
		transparent: wind.attr('transparent')
	};
	websocket_send(data);
}

/* Blinder functions
 */
function points_angle(pos1_x, pos1_y, pos2_x, pos2_y) {
	var dx = pos2_x - pos1_x;
	var dy = pos2_y - pos1_y;

	var angle = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
	if (angle < 0) {
		angle += 360;
	}

	return angle;
}

function points_distance(pos1_x, pos1_y, pos2_x, pos2_y) {
	var dx = pos2_x - pos1_x;
	var dy = pos2_y - pos1_y;

	return Math.round(Math.sqrt(dx * dx + dy * dy));
}

function blinder_position(blinder) {
	var pos1_x = parseInt(blinder.attr('pos1_x'));
	var pos1_y = parseInt(blinder.attr('pos1_y')) - 2;
	var pos2_x = parseInt(blinder.attr('pos2_x'));
	var pos2_y = parseInt(blinder.attr('pos2_y')) - 2;
	var angle = points_angle(pos1_x, pos1_y, pos2_x, pos2_y);
	var distance = points_distance(pos1_x, pos1_y, pos2_x, pos2_y);

	if (dungeon_master == false) {
		blinder.css('display', 'none');
	}

	blinder.css('left', pos1_x + 'px');
	blinder.css('top', pos1_y + 'px');
	blinder.css('width', distance + 'px');
	blinder.css('height', '4px');
	blinder.css('transform', 'rotate(' + angle + 'deg)');
}

/* Zone functions
 */
function zone_announce_group_id(zone_id, zone_group) {
	var data = {
		action: 'zone_group',
		zone_id: zone_id,
		zone_group: zone_group
	};
	websocket_send(data);
}

function zone_check_events(obj, pos) {
	var zone_events = {
		leave: [],
		move:  [],
		enter: []
	}

	$('div.zone').each(function() {
		var in_zone = zone_covers_position($(this), pos);
		var zone_id = $(this).prop('id');
		var zone_event = null;

		if (in_zone) {
			if (zone_presence.includes(zone_id) == false) {
				zone_presence.push(zone_id);
				zone_event = 'enter';
			} else {
				zone_event = 'move';
			}
		} else {
			if (zone_presence.includes(zone_id)) {
				zone_presence = zone_presence.remove(zone_id);
				zone_event = 'leave';
			}
		}

		if (zone_event != null) {
			zone_events[zone_event].push(zone_id);
		}
	});

	zone_events = filter_zone_events(zone_events);

	for (var [event_type, items] of Object.entries(zone_events)) {
		items.forEach(function(zone_id) {
			zone_run_script(zone_id, obj.prop('id'), event_type, pos.left, pos.top);
		});
	}
}

function zone_check_presence_for_turn(character) {
	var char_id = character.prop('id');
	var my_pos = object_position(character);

	$('div.zone').each(function() {
		var zone_pos = object_position($(this));

		if (my_pos.left < zone_pos.left) {
			return;
		} else if (my_pos.top < zone_pos.top) {
			return;
		} else if (my_pos.left >= zone_pos.left + $(this).width()) {
			return;
		} else if (my_pos.top >= zone_pos.top + $(this).height()) {
			return;
		}

		zone_run_script($(this).prop('id'), char_id, 'turn', my_pos.left, my_pos.top);
	});
}

function zone_covers_position(zone, pos) {
	var zone_pos = object_position(zone);

	if (pos.left < zone_pos.left) {
		return false;
	} else if (pos.top < zone_pos.top) {
		return false;
	} else if (pos.left >= zone_pos.left + zone.width()) {
		return false;
	} else if (pos.top >= zone_pos.top + zone.height()) {
		return false;
	}

	return true;
}

function zone_create_object(id, pos_x, pos_y, width, height, color, opacity, group, altitude) {
	var id = 'zone' + id.toString();
	width *= grid_cell_size;
	height *= grid_cell_size;

	if (dungeon_master) {
		if (opacity < 0.2) {
			opacity = 0.2;
		} else if (opacity > 0.8) {
			opacity = 0.8;
		}
	}

	var zone = $('<div id="' + id + '" class="zone" altitude="' + altitude + '" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; background-color:' + color + '; width:' + width + 'px; height:' + height + 'px; opacity:' + opacity + '; z-index:' + LAYER_ZONE + '" />');

	if (group != '') {
		zone.attr('group', group);
	}

	$('div.playarea div.zones').append(zone);

	if (dungeon_master) {
		$('div#' + id).append('<div class="script"></div>');
	}

	if (altitude > 0) {
		if (my_character != null) {
			fog_of_war_update(my_character);
		} else if (fow_obj != null) {
			fog_of_war_update(fow_obj);
		}
	}
}

function zone_create(width, height, color, opacity, group, altitude) {
	$.post('/object/create_zone', {
		map_id: map_id,
		pos_x: Math.round(zone_x / grid_cell_size),
		pos_y: Math.round(zone_y / grid_cell_size),
		width: width,
		height: height,
		color: color,
		opacity: opacity,
		group: group,
		altitude: altitude
	}).done(function(data) {
		instance_id = $(data).find('instance_id').text();

		zone_create_object(instance_id, zone_x, zone_y, width, height, color, opacity, group, altitude);

		$('div#zone' + instance_id).draggable({
			containment: 'div.playarea > div',
			drag: draggable_drag_correction,
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		var data = {
			action: 'zone_create',
			instance_id: instance_id,
			pos_x: zone_x,
			pos_y: zone_y,
			width: width,
			height: height,
			color: color,
			opacity: opacity,
			group: group,
			altitude: altitude
		};
		websocket_send(data);

		$('div#zone' + instance_id).on('contextmenu', function(event) {
			var menu_entries = zone_menu;

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});
	}).fail(function(data) {
		cauldron_alert('Zone create error');
	});
}

function zone_delete(obj) {
	var zone_id = obj.prop('id');
	if (zone_id.substring(0, 4) != 'zone') {
		return;
	}

	$.post('/object/delete', {
		instance_id:zone_id
	}).done(function() {
		var data = {
			action: 'zone_delete',
			instance_id: zone_id
		};
		websocket_send(data);

		obj.off('DOMNodeRemoved');
		obj.remove();
	});
}

function zone_init_presence() {
	if (my_character != null) {
		var my_pos = object_position(my_character);
	} else if (focus_obj) {
		var my_pos = object_position(focus_obj);
	} else {
		return;
	}

	zone_presence = [];
	$('div.zone').each(function() {
		if (zone_covers_position($(this), my_pos)) {
			zone_presence.push($(this).prop('id'));
		}
	});
}

/* Marker functions
*/
function marker_create(pos_x, pos_y, name = null) {
	var marker = $('<div class="marker" style="position:absolute; z-index:' + LAYER_MARKER + '; left:' + pos_x + 'px; top:' + pos_y + 'px;"><img src="/images/marker.png" style="width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px;" /></div>');

	if (name != null) {
		marker.prepend('<span style="margin-bottom:3px">' + name + '</span>');
	}

	$('div.playarea div.markers').append(marker);
	window.setTimeout(function() {
		$('div.marker').first().remove();
	}, 5000);
}
