
/* Adventure functions
 */
function adventure_custom_value(key) {
	return parseInt($('div.playarea').attr('custom' + key));
}

function adventure_custom_value_command(key, value) {
	adventure_custom_value_action(key, value);

    var data = {
        action: 'adventure_custom_value',
		key: key,
        value: value
    };
    websocket_send(data);

    $.post('/object/adventure_custom_value', {
		adventure_id: adventure_id,
		key: key,
		value: value
    });
}

function adventure_custom_value_action(key, value) {
	$('div.playarea').attr('custom' + key, value);

	rule_system_adventure_custom_value(key, value);
}

/* Character functions
 */
function character_custom_value(key, obj = my_character) {
	return parseInt(obj.attr('custom' + key));
}

function character_custom_value_command(key, value) {
	if (dungeon_master) {
		return;
	}

    character_custom_value_action(my_character, key, value);

    var data = {
        action: 'character_custom_value',
        instance_id: my_character.prop('id'),
		key: key,
        value: value
    };
    websocket_send(data);

    $.post('/object/character_custom_value', {
        instance_id: my_character.prop('id'),
		key: key,
		value: value
    });
}

function character_custom_value_action(obj, key, value) {
    obj.attr('custom' + key, value);
}

function character_vision(obj) {
	var char_vision = obj.attr('vision');

	if (char_vision == undefined) {
		return fow_map_distance;
	}

	char_vision = parseInt(char_vision);

	if (char_vision == 0) {
		return 0;
	}

	return Math.max(char_vision, fow_map_distance);
}

/* Object functions
 */
function object_alive(obj) {
	obj.removeClass('dead');
}

function object_click(event) {
	if ($(this).parent().is(focus_obj)) {
		event.stopPropagation();
	}
}

function object_click_mobile(event) {
	event.type = 'contextmenu';
	$(this).trigger(event);
}

function object_contextmenu_dm(event) {
	var obj = $(this).parent();

	var menu_entries = {};

	if (obj.hasClass('selected')) {
		menu_entries['damage'] = { name:'Damage', icon:'fa-warning' };
		menu_entries['heal'] = { name:'Heal', icon:'fa-medkit' };
		if ($('div.character.selected').length == 0) {
			menu_entries['sep1'] = '-';
			menu_entries['presence'] = { name:'Toggle presence', icon:'fa-low-vision' };
			menu_entries['handover'] = { name:'Hand over', icon:'fa-hand-stop-o' };
			menu_entries['takeback'] = { name:'Take back', icon:'fa-hand-grab-o' };
			menu_entries['sep2'] = '-';
			menu_entries['delete'] = { name:'Delete', icon:'fa-trash' };
		}
	} else {
		menu_entries['info'] = { name:'Get information', icon:'fa-info-circle' };
		menu_entries['view'] = { name:'View', icon:'fa-search' };

		var rotate = {
			'rotate_n':  { name:'North', icon:'fa-arrow-circle-up' },
			'rotate_ne': { name:'North East' },
			'rotate_e':  { name:'East', icon:'fa-arrow-circle-right' },
			'rotate_se': { name:'South East' },
			'rotate_s':  { name:'South', icon:'fa-arrow-circle-down' },
			'rotate_sw': { name:'South West' },
			'rotate_w':  { name:'West', icon:'fa-arrow-circle-left' },
			'rotate_nw': { name:'North West' }
		};
		if (obj.attr('token_type') == 'topdown') {
			menu_entries['rotate'] = { name:'Rotate', icon:'fa-compass', items:rotate };
		}

		if (obj.find('span.name').length > 0) {
			if (obj.find('span.name').attr('known') == 'yes') {
				menu_entries['unknown'] = { name:'Make unknown', icon:'fa-question' };
			} else {
				menu_entries['known'] = { name:'Make known', icon:'fa-question' };
			}
		}

		menu_entries['presence'] = { name:'Toggle presence', icon:'fa-low-vision' };
		menu_entries['sep1'] = '-';
		menu_entries['handover'] = { name:'Hand over', icon:'fa-hand-stop-o' };
		menu_entries['takeback'] = { name:'Take back', icon:'fa-hand-grab-o' };
		menu_entries['sep2'] = '-';
		menu_entries['marker'] = { name:'Set marker', icon:'fa-map-marker' };
		menu_entries['distance'] = { name:'Measure distance', icon:'fa-map-signs' };
		menu_entries['coordinates'] = { name:'Get coordinates', icon:'fa-flag' };
		menu_entries['focus'] = { name:'Focus', icon:'fa-binoculars' };
		menu_entries['zone_create'] = { name:'Create zone', icon:'fa-square-o' };
		menu_entries['sep3'] = '-';

		rule_system_menu_token_dm(menu_entries, obj);
		if (object_last_item(menu_entries) != '-') {
			menu_entries['sep4'] = '-';
		}

		menu_entries['lower'] = { name:'Lower', icon:'fa-arrow-down' };
		menu_entries['delete'] = { name:'Delete', icon:'fa-trash' };
	}

	context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);

	return false;
}

function object_contextmenu_player(event) {
	$('div.selected').removeClass('selected');

	var menu_entries = {};
	menu_entries['view'] = { name:'View', icon:'fa-search' };
	menu_entries['sep1'] = '-';

	rule_system_menu_token_player(menu_entries, $(event.target).parent());
	if (object_last_item(menu_entries) != '-') {
		menu_entries['sep2'] = '-';
	}

	menu_entries['marker'] = { name:'Set marker', icon:'fa-map-marker' };
	menu_entries['distance'] = { name:'Measure distance', icon:'fa-map-signs' };

	context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
	return false;
}

function object_create(icon, x, y) {
	var token_id = $(icon).attr('token_id');
	var width = parseInt($(icon).attr('obj_width')) * grid_cell_size;
	var height = parseInt($(icon).attr('obj_height')) * grid_cell_size;
	var url = $(icon).attr('src');
	var armor_class = $(icon).attr('armor_class');
	var hitpoints = $(icon).attr('hitpoints');
	var type = $(icon).parent().find('div.name').text();
	var token_type = $(icon).attr('type');
	var rotation = (token_type == 'topdown' ? 180 : 0);

	var pos = viewport_to_map(x, y);
	x = coord_to_grid(pos.x, false);
	y = coord_to_grid(pos.y, false);

	$.post('/object/create_token', {
		map_id: map_id,
		token_id: token_id,
		pos_x: Math.round(x / grid_cell_size),
		pos_y: Math.round(y / grid_cell_size),
	}).done(function(data) {
		var instance_id = $(data).find('instance_id').text();

		var data = {
			action: 'create',
			instance_id: instance_id,
			pos_x: x,
			pos_y: y,
			type: type,
			armor_class: armor_class,
			hitpoints: hitpoints,
			url: url,
			width: width,
			height:height
		};
		websocket_send(data);

		var obj = '<div id="token' + instance_id + '" token_id="' + token_id +'" class="token ' + token_type + '" style="left:' + x + 'px; top:' + y + 'px; z-index:' + LAYER_TOKEN + '" type="' + type + '" is_hidden="no" rotation="0" armor_class="' + armor_class + '" hitpoints="' + hitpoints + '" damage="0" name="" token_type="' + token_type + '">' +
		          (hitpoints > 0 ? '<div class="hitpoints"><div class="damage" style="width:0%"></div></div>' : '') +
		          '<img src="' + url + '" style="width:' + width + 'px; height:' + height + 'px;" />' +
		          '</div>';

		$('div.playarea div.tokens').append(obj);

		if (parseInt(hitpoints) > 0) {
			$.post('/object/hitpoints', {
				instance_id: 'token' + instance_id,
				hitpoints: hitpoints
			});
		}

		if (parseInt(armor_class) != 10) {
			$.post('/object/armor_class', {
				instance_id: 'token' + instance_id,
				armor_class: armor_class
			});
		}

		if (parseInt(rotation) > 0) {
			object_rotate_command($('div#token' + instance_id), rotation, 0);
		}

		$('div.playarea div#token' + instance_id).on('mousedown', object_mouse_down);

		$('div.playarea div#token' + instance_id).draggable({
			containment: 'div.playarea > div',
			handle: 'img',
			start: object_drag_start,
			drag: object_drag_drag,
			stop: object_drag_stop
		});

		if (mobile_device) {
			$('div#token' + instance_id + ' img').on('click', object_click_mobile);
			$('div#token' + instance_id + ' img').on('click', object_click_mobile);
		} else {
			$('div#token' + instance_id + ' img').on('click', object_click);
			$('div#token' + instance_id + ' img').on('dblclick', object_dblclick);
		}

		$('div#token' + instance_id + ' img').on('contextmenu', object_contextmenu_dm);
	}).fail(function() {
		write_sidebar('Error creating object.');
	});
}

function object_dblclick(event) {
	event.stopPropagation();

	object_focus($(this).parent());
}

/* Correct ui.position for the CSS transform (zoom + pan) on the map container.
 * We store the mouse-to-token offset in map coords at drag start (drag_offset).
 * Each drag event converts the current mouse position to map coords using the
 * current zoom state and adds the offset — zoom changes mid-drag work correctly.
 */
function draggable_drag_correction(event, ui) {
	var offset   = ui.helper.data('drag_offset');
	var mouse_map = viewport_to_map(event.clientX, event.clientY);

	var map_left = Math.round(mouse_map.x + offset.x);
	var map_top  = Math.round(mouse_map.y + offset.y);

	var tw = $(ui.helper).outerWidth()  || 0;
	var th = $(ui.helper).outerHeight() || 0;
	ui.position.left = Math.max(0, Math.min(map_left, map_width  - tw));
	ui.position.top  = Math.max(0, Math.min(map_top,  map_height - th));
}

function object_drag_start(event, ui) {
	context_menu_remove();

	var pos_drag = object_position(ui.helper);

	var mouse_map = viewport_to_map(event.clientX, event.clientY);
	ui.helper.data('drag_offset', {
		x: pos_drag.left - mouse_map.x,
		y: pos_drag.top  - mouse_map.y
	});

	$('div.token.selected, div.character.selected').each(function() {
		if ($(this).is(ui.helper)) {
			return true;
		}

		var pos_obj = object_position($(this));

		$(this).attr('diff_x', Math.round(pos_obj.left - pos_drag.left));
		$(this).attr('diff_y', Math.round(pos_obj.top - pos_drag.top));
	});
}

function object_drag_drag(event, ui) {
	draggable_drag_correction(event, ui);

	$('div.token.selected, div.character.selected').each(function() {
		if ($(this).is(ui.helper)) {
			return true;
		}

		var diff_x = parseInt($(this).attr('diff_x'));
		var diff_y = parseInt($(this).attr('diff_y'));

		var pos_x = Math.max(Math.round(ui.position.left + diff_x), 0);
		var pos_y = Math.max(Math.round(ui.position.top + diff_y), 0);
		pos_x = Math.min(pos_x, map_width - $(this).width());
		pos_y = Math.min(pos_y, map_height - $(this).height());

		$(this).css({
			left: pos_x + 'px',
			top: pos_y + 'px'
		});
	});
}

function object_drag_stop(event, ui) {
	object_move($(this));

	$('div.token.selected, div.character.selected').each(function() {
		if ($(this).is(ui.helper)) {
			return true;
		}

		$(this).removeAttr('diff_x');
		$(this).removeAttr('diff_y');

		object_move($(this));
	});
}

function object_focus(obj) {
	key_to_direction = null;

	if (ctrl_down) {
		if (obj.attr('is_hidden') == 'yes') {
			object_show_command(obj);
		} else {
			object_hide_command(obj);
		}
		return;
	}

	if (shift_down) {
		object_info(obj);
		object_view(obj);
		return;
	}

	if (focus_obj != null) {
		if (obj.is(focus_obj)) {
			return;
		}

		focus_obj.find('img').css('border', '');
	}

	focus_obj = obj;
	focus_obj.find('img').css('border', '1px solid #ffa000');

	zone_init_presence();

	if (keep_centered) {
		scroll_to_my_character(250);
	}
};

function object_dead(obj) {
	obj.addClass('dead');
}

function object_delete(obj) {
	$.post('/object/delete', {
		instance_id: obj.prop('id')
	}).done(function() {
		if (obj.is(focus_obj)) {
			focus_obj = null;
		}

		obj.remove();

		var data = {
			action: 'delete',
			instance_id: obj.prop('id')
		};
		websocket_send(data);
	});
}

function object_hide_command(obj) {
	object_hide_action(obj);

	var data = {
		action: 'hide',
		instance_id: obj.prop('id')
	};
	websocket_send(data);

	$.post('/object/hide', {
		instance_id: obj.prop('id')
	});
}

function object_hide_action(obj) {
	if (dungeon_master) {
		obj.fadeTo(0, OBJECT_HIDDEN_FADE);
	} else {
		obj.hide();
	}

	obj.attr('is_hidden', 'yes');
}

function object_info(obj) {
	var info = '';

	if (obj.hasClass('zone') == false) {
		var name = obj.find('span.name');
		if (name.length > 0) {
			info += 'Name: ' + name.text() + '<br />';
		}

		if (dungeon_master || obj.is(my_character)) {
			if (obj.attr('id').substring(0, 5) == 'token') {
				info += 'Type: ' + obj.attr('type') + '<br />';
			}
		}

		if (dungeon_master && obj.hasClass('character')) {
			if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
				var vision = character_vision(obj);
				if (vision == 0) {
					vision = 'infinite';
				}
				info += 'Vision distance: ' + vision + '<br />';

				info += 'Light radius: ' + obj.attr('light') + '<br />';
			}
		}

		info += rule_system_object_info(obj);
	} else {
		script = obj.find('div.script');
		if (script.length > 0) {
			var dashes = '&mdash;&mdash;&mdash;';
			info += '<b>' + dashes + '[ script ]' + dashes + dashes + '</b>\n';
			info += script.text() + '\n';
			info += '<b>' + dashes + dashes + dashes + dashes + '&mdash;&mdash;</b>\n';
		}
	}

	write_sidebar(info);
}

function object_mouse_down(event) {
	context_menu_remove();
	store_mouse_position(event);

	if ((event.which == 2) && ctrl_down) {
		if ($(this).hasClass('selected')) {
			$(this).removeClass('selected');
		} else if ($(this).hasClass('ui-draggable')) {
			$(this).addClass('selected');
		}
	} else if ($(this).hasClass('selected') == false) {
		$('div.selected').removeClass('selected');
	}

	event.stopPropagation();

	return false;
}

function object_move(obj, speed = 200) {
	var map = $('div.playarea div');
	var max_x = map.width() - obj.width();
	var max_y = map.height() - obj.height();
	var pos = object_position(obj);

	if (pos.left < 0) {
		pos.left = 0;
	} else if (pos.left > max_x) {
		pos.left = max_x;
	}
	pos.left = coord_to_grid(pos.left);

	if (pos.top < 0) {
		pos.top = 0;
	} else if (pos.top > max_y) {
		pos.top = max_y;
	}
	pos.top = coord_to_grid(pos.top);

	obj.css('left', pos.left + 'px');
	obj.css('top', pos.top + 'px');

	var data = {
		action: 'move',
		instance_id: obj.prop('id'),
		pos_x: pos.left,
		pos_y: pos.top,
		speed: speed
	};
	websocket_send(data);

	if (obj.is(my_character)) {
		char_pos_x = Math.round(pos.left / grid_cell_size);
		char_pos_y = Math.round(pos.top / grid_cell_size);
		char_pos_changed = true;
	} else if (obj.hasClass('effect') == false) {
		$.post('/object/move', {
			instance_id: obj.prop('id'),
			pos_x: Math.round(pos.left / grid_cell_size),
			pos_y: Math.round(pos.top / grid_cell_size)
		});
	}

	/* Fog of War
	 */
	if (obj.is(fow_obj) || obj.is(my_character)) {
		fog_of_war_update(obj);
	}

	if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
		if (obj.hasClass('light') && (fow_obj != null)) {
			fog_of_war_update(fow_obj);
		}
	}
}

function object_position(obj) {
	/* Read CSS left/top directly — these are map coordinates regardless of
	 * the zoom/pan transform applied to the parent container. */
	return {
		left: Math.round(parseFloat(obj.css('left')) || 0),
		top:  Math.round(parseFloat(obj.css('top'))  || 0)
	};
}

function object_rotate_command(obj, rotation, speed = 500) {
	object_rotate_action(obj, rotation, speed);

	var data = {
		action: 'rotate',
		instance_id: obj.prop('id'),
		rotation: rotation,
		speed: speed
	};
	websocket_send(data);

	$.post('/object/rotate', {
		instance_id: obj.prop('id'),
		rotation: rotation
	});
}

function object_rotate_action(obj, rotation, speed = 500) {
	var img = obj.find('img');
	var width = Math.round(img.width() / grid_cell_size);
	var height = Math.round(img.height() / grid_cell_size);

	if ((width % 2) != (height % 2)) {
		if (width > height) {
			var tox = ((width - 1) * grid_cell_size) >> 1;
			var toy = (height * grid_cell_size) >> 1;
		} else {
			var tox = (width * grid_cell_size) >> 1;
			var toy = ((height - 1) * grid_cell_size) >> 1;
		}

		img.css('transform-origin', tox + 'px ' + toy + 'px');
	}

	var currot = parseInt(obj.attr('rotation'));
	var anirot = rotation;

	if ((360 + currot - anirot) < (anirot - currot)) {
		anirot -= 360;
	} else if ((360 + anirot - currot) < (currot - anirot)) {
		anirot += 360;
	}

	img.stop(false, true);
	img.animate({
		rotation: anirot
	}, {
		duration: speed,
		step: function(now) {
			$(this).css('transform', 'rotate(' + now + 'deg)');
		},
		done: function() {
			img.animate({ rotation: rotation });
		}
	});

	obj.attr('rotation', rotation);
}

function object_show_action(obj) {
	if (dungeon_master) {
		obj.fadeTo(0, 1);
	} else {
		obj.show();
	}

	obj.attr('is_hidden', 'no');

	/* Fog of War
	 */
	if (my_character != null) {
		fog_of_war_update(my_character);
	} else if (fow_obj != null) {
		fog_of_war_update(fow_obj);
	}
}

function object_show_command(obj) {
	object_show_action(obj);

	var data = {
		action: 'show',
		instance_id: obj.prop('id')
	};
	websocket_send(data);

	$.post('/object/show', {
		instance_id: obj.prop('id')
	});
}

function object_show_fow(obj) {
	if (obj.is(fow_obj)) {
		fog_of_war_destroy();
		fow_obj = null;
	} else {
		if (fow_obj == null) {
			fog_of_war_init(LAYER_FOG_OF_WAR);
		}

		if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
			var distance = character_vision(obj);
			fog_of_war_set_distance(distance);
		}

		fog_of_war_update(obj);
		fow_obj = obj;
	}
}

function object_step(obj, x, y) {
	var pos = object_position(obj);
	var img = $(obj).find('img');
	var width = Math.round(img.width() / grid_cell_size);
	var height = Math.round(img.height() / grid_cell_size);

	/* Wall collision?
	 */
	var pos_x = Math.round(pos.left / grid_cell_size);
	var pos_y = Math.round(pos.top / grid_cell_size);

	if ((width == 1) && (height == 1)) {
		/* 1 x 1
		 */
		if (wall_collision(pos_x, pos_y, pos_x + x, pos_y + y)) {
			return;
		}
		if (door_collision(pos_x, pos_y, pos_x + x, pos_y + y)) {
			return;
		}
	} else if (width == height) {
		/* N x N
		 */
		pos_x += x;
		pos_y += y;
		width -= 1;
		height -= 1;

		for (bx = 0; bx < width; bx++) {
			if (wall_collision(pos_x + bx, pos_y, pos_x + bx + 1, pos_y)) {
				return;
			}
			if (wall_collision(pos_x + bx, pos_y + height, pos_x + bx + 1, pos_y + height)) {
				return;
			}

			if (door_collision(pos_x + bx, pos_y, pos_x + bx + 1, pos_y)) {
				return;
			}
			if (door_collision(pos_x + bx, pos_y + height, pos_x + bx + 1, pos_y + height)) {
				return;
			}
		}

		for (by = 0; by < height; by++) {
			if (wall_collision(pos_x, pos_y + by, pos_x, pos_y + by + 1)) {
				return;
			}
			if (wall_collision(pos_x + width, pos_y + by, pos_x + width, pos_y + by + 1)) {
				return;
			}

			if (door_collision(pos_x, pos_y + by, pos_x, pos_y + by + 1)) {
				return;
			}
			if (door_collision(pos_x + width, pos_y + by, pos_x + width, pos_y + by + 1)) {
				return;
			}
		}
	}

	pos.left += (x * grid_cell_size);
	pos.top += (y * grid_cell_size);

	obj.css('left', pos.left + 'px');
	obj.css('top', pos.top + 'px');
	object_move(obj, 50);

	zone_check_events(obj, pos);

	if (keep_centered) {
		scroll_to_my_character(0);
	}
}

function object_steer(event) {
	if ((dungeon_master == false) && pause) {
		return;
	}

	if (character_steerable == false) {
		return;
	}

	if ($('div.input input:focus').length > 0) {
		return;
	} else if ($('div.filter input:focus').length > 0) {
		return;
	} else if ($('div.windowframe_overlay > div:visible').length > 0) {
		return;
	}

	if (my_character != null) {
		var hitpoints = parseInt(my_character.attr('hitpoints'));
		var damage = parseInt(my_character.attr('damage'));

		if (damage == hitpoints) {
			return;
		}
	}

	if (my_character != null) {
		var obj = my_character;
	} else if (focus_obj != null) {
		var obj = focus_obj;
	} else {
		return;
	}

	if (obj.attr('token_type') == 'topdown') {
		switch (event.which) {
			case KB_ROTATE_LEFT:
				object_turn(obj, -45);
				return;
			case KB_ROTATE_RIGHT:
				object_turn(obj, 45);
				return;
		}
	}

	if (key_to_direction == null) {
		var keys = [ KB_MOVE_UP, KB_MOVE_RIGHT, KB_MOVE_DOWN, KB_MOVE_LEFT ];
		var degrees = [ 0, 90, 180, 270 ];

		key_to_direction = {};
		for (var i = 0; i < keys.length; i++) {
			key_to_direction[keys[i]] = degrees[i];
		}

		if (obj.attr('token_type') == 'portrait') {
			keys = [ KB_MOVE_UP_RIGHT, KB_MOVE_DOWN_RIGHT, KB_MOVE_DOWN_ALT, KB_MOVE_DOWN_LEFT, KB_MOVE_UP_LEFT ];
			degrees = [ 45, 135, 180, 225, 315 ];

			for (var i = 0; i < keys.length; i++) {
				key_to_direction[keys[i]] = degrees[i];
			}
		}
	}

	var directions = {
		  0: [ 0, -1],
		 45: [ 1, -1],
		 90: [ 1,  0],
		135: [ 1,  1],
		180: [ 0,  1],
		225: [-1,  1],
		270: [-1,  0],
		315: [-1, -1]
	}

	var direction = key_to_direction[event.which];
	if (direction == undefined) {
		return;
	}
	var rotation = parseInt(obj.attr('rotation'));
	direction = (rotation + direction) % 360;
	direction = directions[direction];
	var x = direction[0];
	var y = direction[1];

	object_step(obj, x, y);
}

function object_target_link(obj) {
	var message = '[target ' + obj.prop('id') + ']';
	var name = obj.find('span.name');

	if ((name.length > 0) && ((name.attr('known') == 'yes') || obj.hasClass('character'))) {
		message += name.text();
	} else if (obj.attr('type') != undefined) {
		message += obj.attr('type');
	} else if (obj.hasClass('effect')) {
		message += 'this effect';
	} else if (obj.hasClass('zone')) {
		message += 'this zone';
	} else {
		message += 'this object';
	}

	message += '[/target]';

	return message;
}

function object_toggle_presence(obj) {
	if (obj.attr('is_hidden') == 'yes') {
		if (obj.hasClass('selected')) {
			$('div.selected').each(function() {
				object_show_command($(this));
			});
		} else {
			object_show_command(obj);
		}
	} else {
		if (obj.hasClass('selected')) {
			$('div.selected').each(function() {
				object_hide_command($(this));
			});
		} else {
			object_hide_command(obj);
		}
	}
}

function object_turn(obj, direction) {
	var rotation = parseInt(obj.attr('rotation')) + direction;
	if (rotation < 0) {
		rotation += 360;
	} else if (rotation >= 360) {
		rotation -= 360;
	}

	object_rotate_command(obj, rotation, 100);
}

function object_view(obj, max_size = 500) {
	var collectable_id = obj.attr('c_id');

	if (obj.attr('c_found') == 'yes') {
		collectable_id = undefined;
	}

	if (my_character != null) {
		var char_pos = object_position(my_character);
		var obj_pos = object_position(obj);
		var diff_x = Math.round(Math.abs(char_pos.left - obj_pos.left) / grid_cell_size);
		var diff_y = Math.round(Math.abs(char_pos.top - obj_pos.top) / grid_cell_size);

		if ((diff_x > 2) || (diff_y > 2)) {
			collectable_id = undefined;
		}
	}

	var min_size = Math.min(max_size, 200);

	var src = obj.find('img').prop('src');
	if (collectable_id != undefined) {
		var container_src = src;
		var src = '/resources/' + resources_key + '/collectables/' + obj.attr('c_src');
	}

	var color = localStorage.getItem('interface_color');
	var bgcolor = (color == 'dark') ? '64, 64, 64' : '160, 160, 160';

	var onclick = 'javascript:$(this).remove();';
	var div_style = 'position:absolute; z-index:' + LAYER_VIEW + '; top:0; left:0; right:0; bottom:0; background-color:rgba(' + bgcolor + ', 0.8);';
	var span_style = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%);';
	var img_style = 'display:block; max-width:' + max_size + 'px; max-height:' + max_size + 'px; min-width:' + min_size + 'px; min-height:' + min_size + 'px; margin:0 auto;';
	var container_style = 'display:block; max-width:' + max_size + 'px; max-height:' + max_size + 'px; position:absolute; top:100px; left:100px; transform:rotate(180deg);';
	var description = obj.find('img').attr('description');
	var name = obj.find('span.name').text();
	var known = (obj.find('span.name').attr('known') == 'yes');

	var transform = obj.find('img').css('transform');
	if ((transform != 'none') && (collectable_id == undefined)) {
		img_style += ' transform:' + transform + ';';
	}

	if (((obj.hasClass('token') == false) && (obj.hasClass('character') == false)) || (collectable_id != undefined)) {
		span_style += ' border:1px solid #000000; background-color:#ffffff;';
	}

	var view = '<div id="view" style="' + div_style + '" onClick="' + onclick +'">';
	if (container_src != undefined) {
		view += '<img src="' + container_src + '" style="' + container_style + '" />';
	}
	view += '<span style="' + span_style + '"><img src="' + src + '" style="' + img_style + '" />';
	if ((name != '') && known && (container_src == undefined)) {
		view += '<div style="margin-top:30px; border:1px solid #000000; background-color:#ffffff; padding:3px; text-align:center;">' + name + '</div>';
	}
	if ((description != undefined) && (description != '')) {
		description = description.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br />');
		view += '<div style="padding:15px; min-width:500px; max-height:200px; overflow:auto; width:100%; max-width:' + max_size + 'px">' + description + '</div>';
	}
	view += '</span></div>';
	$('body').append(view);

	if ((collectable_id != undefined) && (dungeon_master == false)) {
		$('div#view span').append('<div class="btn-group" style="width:100%"><button class="btn btn-default" style="width:100%">Take item</button></div>');
		$('div#view span button').on('click', function() {
			$.post('/object/collectable/found', {
				collectable_id: collectable_id
			});

			collectable_found_command(collectable_id);

			send_message(character_name + ' has found an item! Check the inventory.', character_name, false);

			if (obj.attr('c_hide') == 'yes') {
				object_hide_command(obj);
			}
		});
	}
}
