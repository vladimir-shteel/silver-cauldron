const DEFAULT_Z_INDEX = 1000;
const LAYER_TOKEN = DEFAULT_Z_INDEX + 1;
const LAYER_CHARACTER = DEFAULT_Z_INDEX + 2;
const LAYER_FOG_OF_WAR = DEFAULT_Z_INDEX + 3;
const LAYER_MARKER = DEFAULT_Z_INDEX + 4;
const LAYER_MENU = DEFAULT_Z_INDEX + 5;

const FOW_NONE = 0;
const FOW_DAY_CELL = 1;
const FOW_DAY_REAL = 2;
const FOW_NIGHT_CELL = 3;
const FOW_NIGHT_REAL = 4;
const FOW_REVEAL = 5;

const DOOR_SECRET = '#a0a000';
const DOOR_OPEN = '#40c040';

const SNAP_MARGE = 5;

const OBJECT_HIDDEN_FADE = 0.6;

var adventure_id = null;
var map_id = null;
var map_width = null;
var map_height = null;
var resources_key = null;
var grid_cell_size = null;
var grid_size = null;
var grid_factor = null;
var z_index = DEFAULT_Z_INDEX;
var constructs_visible = true;
var construct_last_type = null;
var wf_script_editor = null;
var wf_script_manual = null;
var wf_zone_create = null;
var fow_type = null;
var fow_obj = null;
var mouse_x = 0;
var mouse_y = 0;
var measure_diff_x = 0;
var measure_diff_y = 0;
var door_x = 0;
var door_y = 0;
var wall_x = 0;
var wall_y = 0;
var zone_presence = [];
var zone_x = 0;
var zone_y = 0;
var ctrl_down = false;
var shift_down = false;
var alt_down = false;
var menu_defaults = {
	root: 'div.playarea',
	z_index: LAYER_MENU,
	dy_up: 26,
	dy_down: 40
};

function websocket_send(data) {
}

function filter_library() {
	var filter = $('input#filter').val().toLowerCase();

	localStorage.setItem('vault_token_filter', filter);

	$('div.library div.well').show();

	if (filter == '') {
		return;
	}

	$('div.library div.well').each(function() {
		var name = $(this).find('div.name').text().toLowerCase();
		if (name.includes(filter) == false) {
			$(this).hide();
		}
	});
}

function write_sidebar(message) {
	var sidebar = $('div.sidebar');
	sidebar.append('<p>' + message + '</p>');
	sidebar.prop('scrollTop', sidebar.prop('scrollHeight'));
}

function screen_scroll() {
	var scr = {};

	scr.left = Math.round($('div.playarea').scrollLeft());
	scr.top = Math.round($('div.playarea').scrollTop());

	return scr;
}

function toggle_constructs() {
	if (constructs_visible) {
		$('div.blinder').hide();
		$('div.door').hide();
		$('div.wall').hide();
	} else {
		$('div.blinder').show();
		$('div.door').show();
		$('div.wall').show();
	}

	constructs_visible = constructs_visible == false;
}

function tokens_highlight() {
	if ($('head style.highlight').length == 0) {
		$('head').append('<style type="text/css" class="highlight">div.token img, div.character img { border: 3px solid #ffff00 }</style>');
	} else {
		$('head style.highlight').remove();
	}
}

function coord_to_grid(coord, to_nearest_edge = true) {
	var delta = coord % grid_cell_size;
	coord -= delta;

	if (to_nearest_edge && (delta > (grid_cell_size >> 1))) {
		coord += grid_cell_size;
	}

	return coord;
}

function capture_mouse_position(event) {
	var scr = screen_scroll();
	mouse_x = event.clientX + scr.left - 16;
	mouse_y = event.clientY + scr.top - 41;
}

function key_down(event) {
	switch (event.which) {
		case 16:
			// Shift
			shift_down = true;
			break;
		case 17:
			// CTRL
			ctrl_down = true;
			break;
		case 18:
			// ALT
			alt_down = true;
			break;
		case 27:
			// Escape
			blinder_stop();
			door_stop();
			wall_stop();
			measuring_stop();
			$('div.menu').hide();
			context_menu_remove();
			$('div.windowframe_overlay > div:visible').close();
			break;
	}
}

function key_up(event) {
	switch (event.which) {
		case 16:
			// Shift
			shift_down = false;
			break;
		case 17:
			// CTRL
			ctrl_down = false;
			break;
		case 18:
			// ALT
			alt_down = false;
			break;
	}
}

function set_condition(obj, condition, set_only = true) {
	var name = obj.find('span').text();
	if (name == undefined) {
		name = obj.attr('id');
	}

	write_sidebar(name + '\'s condition set to ' + condition);
}

/* Object functions
 */
function object_armor_class(obj) {
	var armor_class = obj.attr('armor_class');

	cauldron_prompt('Armor class:', armor_class, function(armor_class) {
		if (isNaN(armor_class)) {
			write_sidebar('Invalid armor class.');
			return;
		}

		obj.attr('armor_class', armor_class);

		$.post('/object/armor_class', {
			instance_id: obj.prop('id'),
			armor_class: armor_class
		});
	});
}

function object_create(icon, x, y) {
	if ($(icon).hasClass('icon')) {
		// New token
		var token_id = $(icon).attr('token_id');
		var width = parseInt($(icon).attr('obj_width')) * grid_cell_size;
		var height = parseInt($(icon).attr('obj_height')) * grid_cell_size;
		var url = $(icon).attr('src');
		var armor_class = $(icon).attr('armor_class');
		var hitpoints = $(icon).attr('hitpoints');
		var damage = 0;
		var type = $(icon).parent().find('div.name').text();
		var rotation = ($(icon).attr('type') == 'topdown' ? 180 : 0);
		var hidden = 'no';

		var scr = screen_scroll();
		x += scr.left - 30;
		y += scr.top - 40;
	} else {
		// Duplicated token
		var token_id = $(icon).parent().attr('token_id');
		var width = $(icon).outerWidth();
		var height = $(icon).outerHeight();
		var url = $(icon).attr('src');
		var armor_class = $(icon).parent().attr('armor_class');
		var hitpoints = $(icon).parent().attr('hitpoints');
		var damage = $(icon).parent().attr('damage');
		var type = $(icon).parent().attr('type');
		var rotation = $(icon).parent().attr('rotation');
		var hidden = $(icon).parent().attr('is_hidden');
	}

	x = coord_to_grid(x, false);
	y = coord_to_grid(y, false);

	$.post('/object/create_token', {
		map_id: map_id,
		token_id: token_id,
		pos_x: Math.round(x / grid_cell_size),
		pos_y: Math.round(y / grid_cell_size),
	}).done(function(data) {
		var instance_id = $(data).find('instance_id').text();

		var obj = '<div id="token' + instance_id + '" token_id="' + token_id +'" class="token" style="left:' + x + 'px; top:' + y + 'px; width:' + width + 'px; z-index:' + DEFAULT_Z_INDEX + '" type="' + type + '" is_hidden="' + hidden + '" rotation="0" armor_class="' + armor_class + '" hitpoints="' + hitpoints + '" damage="' + damage + '" name="">' +
		          '<img src="' + url + '" style="height:' + height + 'px" />' +
		          '</div>';

		$('div.playarea div.tokens').append(obj);

		if (parseInt(armor_class) != 10) {
			$.post('/object/armor_class', {
				instance_id: 'token' + instance_id,
				armor_class: armor_class
			});
		}

		if (parseInt(hitpoints) > 0) {
			$.post('/object/hitpoints', {
				instance_id: 'token' + instance_id,
				hitpoints: hitpoints
			});
		}

		if (parseInt(damage) > 0) {
			$.post('/object/damage', {
				instance_id: 'token' + instance_id,
				damage: damage
			});
		}

		if (parseInt(rotation) > 0) {
			object_rotate_command($('div#token' + instance_id), rotation);
		}

		if (hidden == 'yes') {
			object_hide_command($('div#token' + instance_id));
		}

		$('div#token' + instance_id).draggable({
			containment: 'div.playarea > div',
			handle: 'img',
			start: object_drag_start,
			drag: object_drag_drag,
			stop: object_drag_stop
		});

		$('div#token' + instance_id).on('mousedown', object_mouse_down);

		object_token_context_menu($('div#token' + instance_id));
	}).fail(function() {
		write_sidebar('Error creating object.');
	});
}

function object_damage(obj) {
	var hitpoints = obj.attr('hitpoints');
	var damage = obj.attr('damage');

	cauldron_prompt('Damage (hitpoints=' + hitpoints + '):', damage, function(damage) {
		if (isNaN(damage)) {
			write_sidebar('Invalid damage.');
			return;
		}

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

function object_delete(obj) {
	$.post('/object/delete', {
		instance_id: obj.prop('id')
	}).done(function() {
		if ((fow_obj != null) && obj.hasClass('light')) {
			obj.attr('state', 'delete');
			fog_of_war_update(fow_obj);
		}

		if (obj.is(fow_obj)) {
			fog_of_war_destroy();
			fow_obj = null;
		}

		obj.remove();

		if ((fow_obj != null) && (obj.hasClass('wall') || obj.hasClass('door') || obj.hasClass('blinder'))) {
			fog_of_war_index_constructs();
			fog_of_war_update(fow_obj);
		}
	});
}

function object_drag_start(event, ui) {
	context_menu_remove();

	var pos_drag = object_position(ui.helper);

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

function object_hide_command(obj) {
	obj.fadeTo(0, OBJECT_HIDDEN_FADE);
	obj.attr('is_hidden', 'yes');

	var data = {
		action: 'hide',
		instance_id: obj.prop('id'),
	};

	$.post('/object/hide', {
		action: 'hide',
		instance_id: obj.prop('id'),
	});
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

function object_info(obj) {
	var info ='';

	if (obj.attr('id').substring(0, 5) == 'token') {
		info += 'Type: ' + obj.attr('type') + '<br />';
	}

	if (obj.attr('id').substring(0, 4) != 'zone') {
		info +=
			'Armor class: ' + obj.attr('armor_class') + '<br />' +
			'Hitpoints: ' + obj.attr('hitpoints') + '<br />' +
			'Damage: ' + obj.attr('damage') + '<br />';
	}

	var name = obj.attr('name');
	if (name == undefined) {
		name = obj.find('span.name').text();
	}
	if ((name != undefined) && (name != '')) {
		info = 'Name: ' + name + '<br />' + info;
	}

	write_sidebar(info);
}

function object_mouse_down(event) {
	context_menu_remove();

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

function object_move(obj) {
	var pos = object_position(obj);
	var map = $('div.playarea div');

	var min = 0;
	var max_x = map.width() - obj.width();
	var max_y = map.height() - obj.height();

	if (obj.prop('id') == 'start') {
		min += grid_cell_size;
		max_x -= grid_cell_size;
		max_y -= grid_cell_size;
	}

	if (pos.left < min) {
		pos.left = min;
	} else if (pos.left > max_x) {
		pos.left = max_x;
	}
	pos.left = coord_to_grid(pos.left);

	if (pos.top < min) {
		pos.top = min;
	} else if (pos.top > max_y) {
		pos.top = max_y;
	}
	pos.top = coord_to_grid(pos.top);

	obj.css('left', pos.left + 'px');
	obj.css('top', pos.top + 'px');

	$.post('/object/move', {
		instance_id: obj.prop('id'),
		map_id: map_id,
		pos_x: Math.round(pos.left / grid_cell_size),
		pos_y: Math.round(pos.top / grid_cell_size)
	});

	if (obj.hasClass('zone')) {
		zone_init_presence();
	}

	if (obj.is(fow_obj)) {
		fog_of_war_update(obj);
	} else if (obj.hasClass('light')) {
		if (fow_obj != null) {
			fog_of_war_update(fow_obj);
		}
	}

	if (obj.hasClass('character') == false) {
		return;
	}

	/* Zone events
	 */
	var zone_events = {
		leave: [],
		move:  [],
		enter: []
	}

	var char_id = obj.prop('id');
	var char_pos = object_position(obj);

	$('div.zone').each(function() {
		var zone_pos = object_position($(this));

		var in_zone = true;
		if (char_pos.left < zone_pos.left) {
			in_zone = false;
		} else if (char_pos.top < zone_pos.top) {
			in_zone = false;
		} else if (char_pos.left >= zone_pos.left + $(this).width()) {
			in_zone = false;
		} else if (char_pos.top >= zone_pos.top + $(this).height()) {
			in_zone = false;
		}

		var zone_id = $(this).prop('id');
		var zone_event = null;

		if (Array.isArray(zone_presence[char_id]) == false) {
			zone_presence[char_id] = [];
		}

		if (in_zone) {
			if (zone_presence[char_id].includes(zone_id) == false) {
				zone_presence[char_id].push(zone_id);
				zone_event = 'enter';
			} else {
				zone_event = 'move';
			}
		} else {
			if (zone_presence[char_id].includes(zone_id)) {
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
			zone_run_script(zone_id, char_id, event_type, pos.left, pos.top, true);

			if (fow_obj != null) {
				fog_of_war_update(fow_obj);
			}
		});
	}
}

function object_name(obj) {
	var c_name = '';
	var c_known = 'yes';

	var name_span = obj.find('span.name');
	if (name_span.length != 0) {
		c_name = name_span.text();
		c_known = name_span.attr('known');
	}

	var body = '<div class="token_name"><label for="name">Name:</label><input type="text" id="name" value="' + c_name + '" maxlength="50" class="form-control" /><label for="known">Visible to players: <input type="checkbox" id="known"' + ((c_known == 'yes' ) ? ' checked' : '') + ' /></label></div>';
	var wf_name = $(body).windowframe({
		style: 'primary',
		header: 'Token name',
		buttons: {
			'Ok': function() {
				var name = wf_name.find('input#name').val();
				var known = wf_name.find('input#known').is(':checked') ? 'yes' : 'no';

				obj.attr('name', name);

				obj.find('span').remove();
				if (name != '') {
					obj.append('<span class="name" known="' + known + '">' + name + '</span>');
				}

				$.post('/object/name', {
					instance_id: obj.prop('id'),
					name: name
				});

				$.post('/object/known', {
					instance_id: obj.prop('id'),
					known: known
				});

				$(this).close();
			},
			'Cancel': function() {
				$(this).close();
			}
		},
		open: function() {
			var input = wf_name.find('input#name');
			var length = input.val().length;
			input.focus();
			input[0].setSelectionRange(length, length);
		},
		close: function() {
			wf_name.destroy();
			delete body;
		}
	});

	wf_name.open();
}

function object_position(obj) {
	var pos = obj.position();
	pos.left = Math.round(pos.left);
	pos.top = Math.round(pos.top);

	var scr = screen_scroll();
	pos.left += scr.left;
	pos.top += scr.top;

	return pos;
}

function object_rotate_command(obj, rotation) {
	object_rotate_action(obj, rotation);

	$.post('/object/rotate', {
		instance_id: obj.prop('id'),
		rotation: rotation
	});
}

function object_rotate_action(obj, rotation) {
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

	img.css('transform', 'rotate(' + rotation + 'deg)');
	obj.attr('rotation', rotation);
}

function object_show_command(obj) {
	obj.fadeTo(0, 1);
	obj.attr('is_hidden', 'no');

	var data = {
		action: 'show',
		instance_id: obj.prop('id'),
	};

	$.post('/object/show', {
		instance_id: obj.prop('id'),
	});
}

function object_token_context_menu(objects) {
	objects.find('img').on('contextmenu', function(event) {
		var obj = $(this).parent();

		$('div.character.selected').removeClass('selected');

		if (obj.hasClass('selected')) { 
			var menu_entries = {
				'presence': { name:'Toggle presence', icon:'fa-low-vision' },
				'delete': { name:'Delete', icon:'fa-trash' }
			};
		} else {
			var menu_entries = {
				'info': { name:'Get information', icon:'fa-info-circle' },
				'name': { name:'Set name', icon:'fa-edit' },
				'rotate': { name:'Rotate', icon:'fa-compass', items:{
					'rotate_n':  { name:'North', icon:'fa-arrow-circle-up' },
					'rotate_ne': { name:'North East' },
					'rotate_e':  { name:'East', icon:'fa-arrow-circle-right' },
					'rotate_se': { name:'South East' },
					'rotate_s':  { name:'South', icon:'fa-arrow-circle-down' },
					'rotate_sw': { name:'South West' },
					'rotate_w':  { name:'West', icon:'fa-arrow-circle-left' },
					'rotate_nw': { name:'North West' },
				}},
				'presence': { name:'Toggle presence', icon:'fa-low-vision' },
				'collectable': { name:'Assign collectable', icon:'fa-key' },
				'fow': { name:'Toggle Fog of War', icon:'fa-cloud' },
				'sep1': '-',
				'armor_class': { name:'Set armor class', icon:'fa-shield' },
				'hitpoints': { name:'Set hitpoints', icon:'fa-heartbeat' },
				'damage': { name:'Set damage', icon:'fa-warning' },
				'sep2': '-',
				'distance': { name:'Measure distance', icon:'fa-map-signs' },
				'coordinates': { name:'Get coordinates', icon:'fa-flag' },
				'sep3': '-',
				'blinder_create': { name:'Create blinder', icon:'fa-eye-slash' },
				'door_create': { name:'Create door', icon:'fa-columns' },
				'wall_create': { name:'Create wall', icon:'fa-th-large' },
				'window_create': { name:'Create window', icon:'fa-window-maximize' },
				'zone_create': { name:'Create zone', icon:'fa-square-o' },
				'sep4': '-',
				'lower': { name:'Lower', icon:'fa-arrow-down' },
				'duplicate': { name:'Duplicate', icon:'fa-copy' },
				'delete': { name:'Delete', icon:'fa-trash' }
			};

			if (obj.attr('token_type') == 'portrait') {
				delete menu_entries['rotate'];
			}
		}

		context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
		return false;
	});
}

/* Measuring functions
 */
function measuring_stop() {
	$('div.playarea').off('mousemove');
	$('div.ruler').remove();

	$('p.measure').text('Distance: ' + $('p.measure').text());
	$('p.measure').removeClass('measure');
}

/* Blinder functions
 */
function blinder_create_command() {
	construct_last_type = 'blinder';

	blinder_stop();
	door_stop();
	measuring_stop();
	wall_stop();

	var check_coords = function(bx, by, blinder, edge) {
		x = parseInt(blinder.attr('pos' + edge + '_x'));
		y = parseInt(blinder.attr('pos' + edge + '_y'));

		if ((bx > x - SNAP_MARGE) && (bx < x + SNAP_MARGE)) {
			if ((by > y - SNAP_MARGE) && (by < y + SNAP_MARGE)) {
				return [x, y];
			}
		}

		return [bx, by];
	};

	if (alt_down) {
		var blinder_x = mouse_x;
		var blinder_y = mouse_y;

		$('div.blinder').each(function() {
			[blinder_x, blinder_y] = check_coords(blinder_x, blinder_y, $(this), 1);
			[blinder_x, blinder_y] = check_coords(blinder_x, blinder_y, $(this), 2);
		});

		if ((blinder_x == mouse_x) && (blinder_y == mouse_y)) {
			var edge_x = coord_to_grid(blinder_x, true);
			var edge_y = coord_to_grid(blinder_y, true);

			if ((Math.abs(edge_x - blinder_x) < SNAP_MARGE)) {
				blinder_x = edge_x;
			}

			if ((Math.abs(edge_y - blinder_y) < SNAP_MARGE)) {
				blinder_y = edge_y;
			}
		}
	} else {
		var blinder_x = coord_to_grid(mouse_x, true);
		var blinder_y = coord_to_grid(mouse_y, true);
	}

	var blinder = '<div id="new_blinder" class="blinder" pos1_x="' + blinder_x + '" pos1_y="' + blinder_y + '" pos2_x="' + blinder_x + '" pos2_y="' + blinder_y + '" />';
	$('div.playarea div.blinders').append(blinder);
	$('div#new_blinder').each(function() {
		blinder_position($(this));
	});

	$('div.playarea').on('mousemove', function(event) {
		capture_mouse_position(event);

		if (alt_down) {
			var blinder_x = mouse_x;
			var blinder_y = mouse_y;

			$('div.blinder').each(function() {
				if ($(this).attr('id') == 'new_blinder') {
					return true;
				}

				[blinder_x, blinder_y] = check_coords(blinder_x, blinder_y, $(this), 1);
				[blinder_x, blinder_y] = check_coords(blinder_x, blinder_y, $(this), 2);
			});
		} else {
			var blinder_x = coord_to_grid(mouse_x, true);
			var blinder_y = coord_to_grid(mouse_y, true);
		}

		if (shift_down) {
			var blinder = $('div.blinders div#new_blinder');
			var pos_x = parseInt(blinder.attr('pos1_x'));
			var pos_y = parseInt(blinder.attr('pos1_y'));
			var delta_x = Math.abs(pos_x - blinder_x);
			var delta_y = Math.abs(pos_y - blinder_y);

			if (delta_x > delta_y) {
				blinder_y = pos_y;
			} else {
				blinder_x = pos_x;
			}
		}

		$('div.playarea div#new_blinder').last().each(function() {
			$(this).attr('pos2_x', blinder_x);
			$(this).attr('pos2_y', blinder_y);
			blinder_position($(this));
		});
	});

	$('div.playarea').on('click', function(event) {
		var pos1_x = parseInt($('div.playarea div#new_blinder').attr('pos1_x'));
		var pos1_y = parseInt($('div.playarea div#new_blinder').attr('pos1_y'));
		var pos2_x = parseInt($('div.playarea div#new_blinder').attr('pos2_x'));
		var pos2_y = parseInt($('div.playarea div#new_blinder').attr('pos2_y'));

		if (pos1_x < 0) pos1_x = 0;
		if (pos1_y < 0) pos1_y = 0;
		if (pos2_x < 0) pos2_x = 0;
		if (pos2_y < 0) pos2_y = 0;

		if ((pos1_x == pos2_x) && (pos1_y == pos2_y)) {
			return;
		}

		if (ctrl_down == false) {
			blinder_stop(false);
		}

		pos1_x *= grid_factor;
		pos1_y *= grid_factor;
		pos2_x *= grid_factor;
		pos2_y *= grid_factor;

		blinder_create_action(pos1_x, pos1_y, pos2_x, pos2_y);

		if (ctrl_down) {
			var blinder_x = mouse_x;
			var blinder_y = mouse_y;

			if (alt_down == false) {
				blinder_x = coord_to_grid(blinder_x, true);
				blinder_y = coord_to_grid(blinder_y, true);
			}

			var blinder = '<div id="new_blinder" class="blinder" pos1_x="' + blinder_x + '" pos1_y="' + blinder_y + '" pos2_x="' + blinder_x + '" pos2_y="' + blinder_y + '" />';
			$('div.playarea div.blinders').append(blinder);
			$('div#new_blinder').each(function() {
				blinder_position($(this));
			});
		}
	});
}

function blinder_create_action(pos1_x, pos1_y, pos2_x, pos2_y) {
	$.post('/object/create_blinder', {
		map_id: map_id,
		pos1_x: pos1_x,
		pos1_y: pos1_y,
		pos2_x: pos2_x,
		pos2_y: pos2_y
	}).done(function(data) {
		instance_id = $(data).find('instance_id').text();

		$('div.playarea div#new_blinder').first().attr('id', 'blinder' + instance_id);

		$('div#blinder' + instance_id).on('contextmenu', function(event) {
			var menu_entries = {
				'delete': { name:'Delete', icon:'fa-trash' },
				'blinder_create': { name:'Create blinder', icon:'fa-eye-slash' }
			};

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		$('div#blinder' + instance_id).on('dblclick', function() {
			if (shift_down) {
				object_delete($(this));
			}
		});

		if (fow_obj != null) {
			fog_of_war_index_constructs();
			fog_of_war_update(fow_obj);
		}
	}).fail(function(data) {
		$('div.playarea div#new_blinder').remove();
		cauldron_alert('Blinder create error');
	});
}

function points_angle(pos1_x, pos1_y, pos2_x, pos2_y) {
	var dx = pos2_x - pos1_x;
	var dy = pos2_y - pos1_y;

	var angle = Math.atan2(dy, dx) * 180 / Math.PI;
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

	blinder.css('left', pos1_x + 'px');
	blinder.css('top', pos1_y + 'px');
	blinder.css('width', distance + 'px');
	blinder.css('height', '4px');
	blinder.css('transform', 'rotate(' + angle + 'deg)');
}

function blinder_stop(remove = true) {
	if (remove) {
		$('div.playarea div#new_blinder').remove();
	}
	$('div.playarea').off('mousemove');
	$('div.playarea').off('click');
}

/* Door functions
 */
function door_create_command() {
	construct_last_type = 'door';

	blinder_stop();
	door_stop();
	measuring_stop();
	wall_stop();

	door_x = Math.round(coord_to_grid(mouse_x, true) / grid_cell_size);
	door_y = Math.round(coord_to_grid(mouse_y, true) / grid_cell_size);

	var door = '<div id="new_door" class="door" pos_x="' + door_x + '" pos_y="' + door_y + '" state="closed" length="0" direction="horizontal" />';
	$('div.playarea div.doors').append(door);
	$('div.playarea div#new_door').each(function() {
		door_position($(this));
	});

	$('div.playarea').on('mousemove', function(event) {
		capture_mouse_position(event);

		var pos_x = door_x;
		var pos_y = door_y;
		var end_x = Math.round(coord_to_grid(mouse_x, true) / grid_cell_size);
		var end_y = Math.round(coord_to_grid(mouse_y, true) / grid_cell_size);

		var diff_x = Math.abs(end_x - pos_x);
		var diff_y = Math.abs(end_y - pos_y);

		if (diff_x > diff_y) {
			if (end_x < pos_x) {
				pos_x = end_x;
			}
			var length = diff_x;
			var direction = 'horizontal';
		} else {
			if (end_y < pos_y) {
				pos_y = end_y;
			}
			var length = diff_y;
			var direction = 'vertical';
		}

		$('div.playarea div#new_door').each(function() {
			$(this).attr('pos_x', pos_x);
			$(this).attr('pos_y', pos_y);
			$(this).attr('length', length);
			$(this).attr('direction', direction);
			door_position($(this));
		});
	});

	$('div.playarea').on('click', function(event) {
		var length = parseInt($('div.playarea div#new_door').attr('length'));
		if (length == 0) {
			return;
		}

		door_stop(false);

		var pos_x = $('div.playarea div#new_door').attr('pos_x');
		var pos_y = $('div.playarea div#new_door').attr('pos_y');
		var direction = $('div.playarea div#new_door').attr('direction');

		door_create_action(pos_x, pos_y, length, direction, 'closed');
	});
}

function door_create_action(pos_x, pos_y, length, direction, state) {
	$.post('/object/create_door', {
		map_id: map_id,
		pos_x: pos_x,
		pos_y: pos_y,
		length: length,
		direction: direction,
		state: state,
		secret: 0,
		bars: 0
	}).done(function(data) {
		instance_id = $(data).find('instance_id').text();

		$('div.playarea div#new_door').attr('id', 'door' + instance_id);

		$('div#door' + instance_id).on('dblclick', function() {
			if (shift_down) {
				object_delete($(this));
			}
		});

		$('div#door' + instance_id).on('contextmenu', function(event) {
			var menu_entries = {};

			if ($(this).attr('state') == 'closed') {
				menu_entries['door_open'] = { name:'Open', icon:'fa-toggle-on' };
			} else {
				menu_entries['door_close'] = { name:'Close', icon:'fa-toggle-off' };
			}

			if ($(this).attr('secret') == 'yes') {
				menu_entries['door_normal'] = { name:'Normal', icon:'fa-eye' };
			} else {
				menu_entries['door_secret'] = { name:'Secret', icon:'fa-eye-slash' };
			}

			if ($(this).attr('bars') == 'yes') {
				menu_entries['door_solid'] = { name:'Solid', icon:'fa-square' };
			} else {
				menu_entries['door_bars'] = { name:'Bars', icon:'fa-table' };
			}

			menu_entries['sep'] = '-';
			menu_entries['delete'] = { name:'Delete', icon:'fa-trash' };

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		if (fow_obj != null) {
			fog_of_war_index_constructs();
			fog_of_war_update(fow_obj);
		}
	}).fail(function(data) {
		$('div.playarea div#new_door').remove();
		cauldron_alert('Door create error');
	});
}

function door_position(door) {
	var pos_x = parseInt(door.attr('pos_x'));
	var pos_y = parseInt(door.attr('pos_y'));
	var length = parseInt(door.attr('length'));
	var direction = door.attr('direction');

	pos_x *= grid_cell_size;
	pos_y *= grid_cell_size;
	length *= grid_cell_size;

	if (direction == 'horizontal') {
		var width = length;
		var height = 9;
		pos_y -= 4;
	} else if (direction == 'vertical') {
		var width = 9;
		var height = length;
		pos_x -= 4;
	} else {
		return;
	}

	door.css('left', pos_x + 'px');
	door.css('top', pos_y + 'px');
	door.css('width', width + 'px');
	door.css('height', height + 'px');

	if (door.attr('state') == 'open') {
		door.css('background-color', DOOR_OPEN);
	} else if (door.attr('secret') == 'yes') {
		door.css('background-color', DOOR_SECRET);
	}

	if (door.attr('bars') == 'yes') {
		if (direction == 'horizontal') {
			door.css('background-image', 'repeating-linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0) 5px, #000000 5px, #000000 10px)');
		} else {
			door.css('background-image', 'repeating-linear-gradient(0deg, rgba(0,0,0,0), rgba(0,0,0,0) 5px, #000000 5px, #000000 10px)');
		}
	}
}

function door_stop(remove = true) {
	if (remove) {
		$('div.playarea div#new_door').remove();
	}
	$('div.playarea').off('mousemove');
	$('div.playarea').off('click');
}

/* Light functions
 */
function light_create(pos_x, pos_y, radius) {
	$.post('/object/create_light', {
		map_id: map_id,
		pos_x: pos_x,
		pos_y: pos_y,
		radius: radius
	}).done(function(data) {
		instance_id = $(data).find('instance_id').text();

		pos_x *= grid_cell_size;
		pos_y *= grid_cell_size;

		var light = $('<img id="light' + instance_id + '" src="/images/light_on.png" class="light" radius="' + radius + '" title="Radius: ' + radius + '" state="on" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px" />');
		$('div.playarea div.lights').append(light);

		$('img#light' + instance_id).draggable({
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		$('img#light' + instance_id).on('contextmenu', function(event) {
			var menu_entries = {};

			menu_entries['light_radius'] = { name:'Set radius', icon:'fa-dot-circle-o' };

			if ($(this).attr('state') == 'on') {
				menu_entries['light_toggle'] = { name:'Turn off', icon:'fa-toggle-off' };
			} else {
				menu_entries['light_toggle'] = { name:'Turn on', icon:'fa-toggle-on' };
			}

			menu_entries['delete'] = { name:'Delete', icon:'fa-trash' };

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		if (fow_obj != null) {
			fog_of_war_update(fow_obj);
		}
	}).fail(function(data) {
		cauldron_alert('Light create error');
	});
}

function light_set(light_id, state) {
	var light = $('img#light' + light_id);

	if (light.length == 0) {
		return;
	}

	$.post('/object/light_state', {
		light_id: light_id,
		state: state
	}).done(function(data) {
		light.attr('state', state);
		light.attr('src', '/images/light_' + state + '.png');

		if (fow_obj != null) {
			fog_of_war_update(fow_obj);
		}
	});
}

/* Wall functions
 */
function wall_create_command(key) {
	if (key == 'wall_create') {
		construct_last_type = 'wall';
	} else {
		construct_last_type = 'window';
	}

	blinder_stop();
	door_stop();
	measuring_stop();
	wall_stop();

	wall_x = Math.round(coord_to_grid(mouse_x, true) / grid_cell_size);
	wall_y = Math.round(coord_to_grid(mouse_y, true) / grid_cell_size);

	var type = (key == 'wall_create') ? 'wall' : 'wall window';
	var transparent = (key == 'wall_create') ? 'no' : 'yes';
	var wall = '<div id="new_wall" class="' + type + '" pos_x="' + wall_x + '" pos_y="' + wall_y + '" length="0" direction="horizontal" transparent="' + transparent + '" />';
	$('div.playarea div.walls').append(wall);
	$('div#new_wall').each(function() {
		wall_position($(this));
	});

	$('div.playarea').on('mousemove', function(event) {
		capture_mouse_position(event);

		var pos_x = wall_x;
		var pos_y = wall_y;
		var end_x = Math.round(coord_to_grid(mouse_x, true) / grid_cell_size);
		var end_y = Math.round(coord_to_grid(mouse_y, true) / grid_cell_size);

		var diff_x = Math.abs(end_x - pos_x);
		var diff_y = Math.abs(end_y - pos_y);

		if (diff_x > diff_y) {
			if (end_x < pos_x) {
				pos_x = end_x;
			}
			var length = diff_x;
			var direction = 'horizontal';
		} else {
			if (end_y < pos_y) {
				pos_y = end_y;
			}
			var length = diff_y;
			var direction = 'vertical';
		}

		$('div.playarea div#new_wall').last().each(function() {
			$(this).attr('pos_x', pos_x);
			$(this).attr('pos_y', pos_y);
			$(this).attr('length', length);
			$(this).attr('direction', direction);
			wall_position($(this));
		});
	});

	$('div.playarea').on('click', function(event) {
		var length = parseInt($('div.playarea div#new_wall').attr('length'));
		if (length == 0) {
			return;
		}

		if (ctrl_down == false) {
			wall_stop(false);
		}

		var pos_x = $('div.playarea div#new_wall').attr('pos_x');
		var pos_y = $('div.playarea div#new_wall').attr('pos_y');
		var direction = $('div.playarea div#new_wall').attr('direction');

		if ((length == 0) || (length == undefined)) {
			return;
		}

		wall_create_action(pos_x, pos_y, length, direction, key == 'window_create');

		if (ctrl_down) {
			wall_x = Math.round(coord_to_grid(mouse_x, true) / grid_cell_size);
			wall_y = Math.round(coord_to_grid(mouse_y, true) / grid_cell_size);

			var type = (key == 'wall_create') ? 'wall' : 'wall window';
			var wall = '<div id="new_wall" class="' + type + '" pos_x="' + wall_x + '" pos_y="' + wall_y + '" length="0" direction="horizontal" transparent="' + transparent + '" />';
			$('div.playarea div.walls').append(wall);
			$('div#new_wall').each(function() {
				wall_position($(this));
			});
		}
	});
}

function wall_create_action(pos_x, pos_y, length, direction, transparent) {
	$.post('/object/create_wall', {
		map_id: map_id,
		pos_x: pos_x,
		pos_y: pos_y,
		length: length,
		direction: direction,
		transparent: transparent
	}).done(function(data) {
		instance_id = $(data).find('instance_id').text();

		$('div.playarea div#new_wall').first().attr('id', 'wall' + instance_id);

		$('div#wall' + instance_id).on('contextmenu', function(event) {
			var menu_entries = {
				'delete': { name:'Delete', icon:'fa-trash' },
				'blinder_create': { name:'Create blinder', icon:'fa-eye-slash' }
			};

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		$('div#wall' + instance_id).on('dblclick', function() {
			if (shift_down) {
				object_delete($(this));
			}
		});

		if (fow_obj != null) {
			fog_of_war_index_constructs();
			fog_of_war_update(fow_obj);
		}
	}).fail(function(data) {
		$('div.playarea div#new_wall').remove();
		cauldron_alert('Wall create error');
	});
}

function wall_position(wall) {
	var pos_x = parseInt(wall.attr('pos_x'));
	var pos_y = parseInt(wall.attr('pos_y'));
	var length = parseInt(wall.attr('length'));
	var direction = wall.attr('direction');

	pos_x *= grid_cell_size;
	pos_y *= grid_cell_size;
	length *= grid_cell_size;

	if (direction == 'horizontal') {
		var width = length;
		var height = 5;
		pos_y -= 2;
	} else if (direction == 'vertical') {
		var width = 5;
		var height = length;
		pos_x -= 2;
	} else {
		return;
	}

	wall.css('left', pos_x + 'px');
	wall.css('top', pos_y + 'px');
	wall.css('width', width + 'px');
	wall.css('height', height + 'px');
}

function wall_stop(remove = true) {
	if (remove) {
		$('div.playarea div#new_wall').remove();
	}
	$('div.playarea').off('mousemove');
	$('div.playarea').off('click');
}

/* Zone functions
 */
function zone_init_presence() {
	zone_presence = [];

	$('div.character').each(function() {
		var character = $(this);
		var char_id = character.prop('id');
		zone_presence[char_id] = [];

		$('div.zone').each(function() {
			var my_pos = object_position(character);
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

			zone_presence[char_id].push($(this).prop('id'));
		});
	});
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

		width *= grid_cell_size;
		height *= grid_cell_size;

		if (opacity < 0.2) {
			opacity = 0.2;
		} else if (opacity > 0.8) {
			opacity = 0.8;
		}

		var zone = $('<div id="zone' + instance_id + '" class="zone" altitude="' + altitude + '" style="position:absolute; left:' + zone_x + 'px; top:' + zone_y + 'px; background-color:' + color + '; width:' + width + 'px; height:' + height + 'px; opacity:' + opacity + ';"><div class="script"></div></div>');

		if (group != '') {
			zone.attr('group', group);
		}

		$('div.playarea div.zones').prepend(zone);

		$('div#zone' + instance_id).draggable({
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		$('div#zone' + instance_id).on('contextmenu', function(event) {
			var menu_entries = {
				'info': { name:'Info', icon:'fa-info-circle' },
				'script': { name:'Event script', icon:'fa-edit' },
				'sep1': '-',
				'distance': { name:'Measure distance', icon:'fa-map-signs' },
				'coordinates': { name:'Get coordinates', icon:'fa-flag' },
				'sep2': '-',
				'delete': { name:'Delete', icon:'fa-trash' }
			};

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});
	}).fail(function(data) {
		cauldron_alert('Zone create error');
	});
}

function zone_group_highlight() {
	var group = $(this).attr('group');

	if ((group == undefined) || (group == '')) {
		return;
	}

	$('div.zone[group="' + group + '"]').css('border', '3px double #ff8000');
}

function zone_group_unhighlight() {
	$('div.zone').css('border', '');
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

/* Collectable functions
 */
function collectables_select(obj) {
	var instance_id = obj.prop('id').substring(5);
	$.post('/object/collectables/unused', {
		adventure_id: adventure_id,
		instance_id: instance_id
	}).done(function(data) {
		var body = $('<div class="collectables"><select class="form-control" ><option value="0">-</option></select></div>');

		$(data).find('collectable').each(function() {
			var c_id = $(this).attr('id');
			var c_token_id = $(this).find('map_token_id').text();
			var c_name = $(this).find('name').text();
			var collectable = $('<option value="' + c_id + '">' + c_name + '</option>');

			if (c_token_id == instance_id) {
				collectable.attr('selected', 'selected');
			}

			body.find('select').append(collectable);
		});

		var wf_collectables = $(body).windowframe({
			style: 'primary',
			header: 'Collectables',
			info: 'There is where place a collectable in a token on the map. A collectable is an object that players can find. When found, the collectable is added to the player\'s inventory.</p></p>Before you can assign a collectable to a token, you first have to create it. This can be done in the <a href="/vault/collectable">Collectables section</a> of the DM\'s Vault.',
			buttons: {
				'Save': function() {
					var collectable_id = $('div.collectables select').val();
					$.post('/object/collectable/place', {
						collectable_id: collectable_id,
						instance_id: instance_id
					}).done(function() {
						wf_collectables.close();
					});
				},
				'Cancel': function() {
					$(this).close();
				}
			},
			close: function() {
				wf_collectables.destroy();
				delete body;
			}
		});

		wf_collectables.open();
	});
}

/* Input functions
 */
function context_menu_handler(key) {
	var obj = $(this);
	if (obj.hasClass('light') == false) {
		if (obj.prop('tagName').toLowerCase() == 'img') {
			var obj = $(this).parent();
		}
	}

	var parts = key.split('_');
	if (parts[0] == 'rotate') {
		key = parts[0];
		var direction = parts[1];
	}

	switch (key) {
		case 'armor_class':
			object_armor_class(obj);
			break;
		case 'blinder_create':
			blinder_create_command();
			break;
		case 'collectable':
			collectables_select(obj);
			break;
		case 'coordinates':
			var pos_x = Math.round(coord_to_grid(mouse_x, false) / grid_cell_size);
			var pos_y = Math.round(coord_to_grid(mouse_y, false) / grid_cell_size);
			write_sidebar('Coordinates: ' + pos_x + ',' + pos_y);
			break;
		case 'damage':
			object_damage(obj);
			break;
		case 'delete':
			cauldron_confirm('Delete object(s)?', function() {
				var zone_group = obj.attr('group');
				if (zone_group != undefined) {
					if (confirm('Delete all zones in group ' + zone_group + '?')) {
						$('div.zone[group="' + zone_group +'"]').each(function() {
							object_delete($(this));
						});
					} else {
						object_delete(obj);
					}
				} else if (obj.hasClass('selected')) {
					$('div.selected').each(function() {
						object_delete($(this));
					});
				} else {
					object_delete(obj);
				}
			});
			break;
		case 'distance':
			blinder_stop();
			door_stop();
			measuring_stop();
			wall_stop();

			var ruler_x = coord_to_grid(mouse_x, false);
			var ruler_y = coord_to_grid(mouse_y, false);

			var ruler_position = function(to_x, to_y) {
				var angle = points_angle(ruler_x, ruler_y, to_x, to_y);
				var distance = points_distance(ruler_x, ruler_y, to_x, to_y);

				var ruler = $('div.ruler');
				ruler.css('width', distance + 'px');
				ruler.css('height', '4px');
				ruler.css('transform', 'rotate(' + angle + 'deg)');

				measure_diff_x = Math.round(Math.abs(to_x - ruler_x) / grid_cell_size);
				measure_diff_y = Math.round(Math.abs(to_y - ruler_y) / grid_cell_size);

				var distance = (measure_diff_x > measure_diff_y) ? measure_diff_x : measure_diff_y;

				$('p.measure').text(distance + ' / ' + (distance * 5) + 'ft / ' + (measure_diff_x + 1) + 'x' + (measure_diff_y + 1));
			}

			var sidebar = $('div.sidebar');
			sidebar.append('<p class="measure">&nbsp;</p>');
			sidebar.prop('scrollTop', sidebar.prop('scrollHeight'));

			$('div.playarea div.markers').append('<div class="ruler" />');
			var ruler = $('div.ruler');
			ruler.css('left', (ruler_x + (grid_cell_size >> 1)) + 'px');
			ruler.css('top', (ruler_y + (grid_cell_size >> 1)) + 'px');
			ruler_position(ruler_x, ruler_y);

			$('div.playarea').mousemove(function(event) {
				var scr = screen_scroll();
				var to_x = event.clientX + scr.left - 16;
				to_x = coord_to_grid(to_x, false);
				var to_y = event.clientY + scr.top - 41;
				to_y = coord_to_grid(to_y, false);

				ruler_position(to_x, to_y);
			});

			$('div.playarea').one('click', function(event) {
				measuring_stop();
			});
			break;
		case 'door_bars':
			obj.attr('bars', 'yes');

			if (obj.attr('direction') == 'horizontal') {
				obj.css('background-image', 'repeating-linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0) 5px, #000000 5px, #000000 10px)');
			} else {
				obj.css('background-image', 'repeating-linear-gradient(0deg, rgba(0,0,0,0), rgba(0,0,0,0) 5px, #000000 5px, #000000 10px)');
			}

			$.post('/object/door_bars', {
				door_id: obj.prop('id').substring(4),
				bars: 'yes'
			});

			if (fow_obj != null) {
				fog_of_war_index_constructs();
				fog_of_war_update(fow_obj);
			}
			break;
		case 'door_create':
			door_create_command();
			break;
		case 'door_close':
			obj.attr('state', 'closed');
			if (obj.attr('secret') == 'yes') {
				obj.css('background-color', DOOR_SECRET);
			} else {
				obj.css('background-color', '');
			}

			$.post('/object/door_state', {
				door_id: obj.prop('id').substring(4),
				state: obj.attr('state')
			});

			if (fow_obj != null) {
				fog_of_war_update(fow_obj);
			}
			break;
		case 'door_secret':
			obj.attr('secret', 'yes');
			if (obj.attr('state') == 'closed') {
				obj.css('background-color', DOOR_SECRET);
			}

			$.post('/object/door_secret', {
				door_id: obj.prop('id').substring(4),
				secret: 'yes'
			});
			break;
		case 'door_normal':
			obj.attr('secret', 'no');
			if (obj.attr('state') == 'closed') {
				obj.css('background-color', '');
			}

			$.post('/object/door_secret', {
				door_id: obj.prop('id').substring(4),
				secret: 'no'
			});
			break;
		case 'door_open':
			obj.attr('state', 'open');
			obj.css('background-color', DOOR_OPEN);

			$.post('/object/door_state', {
				door_id: obj.prop('id').substring(4),
				state: obj.attr('state')
			});

			if (fow_obj != null) {
				fog_of_war_update(fow_obj);
			}
			break;
		case 'door_solid':
			obj.attr('bars', 'no');
			obj.css('background-size', '');
			obj.css('background-position', '');
			obj.css('background-image', '');

			$.post('/object/door_bars', {
				door_id: obj.prop('id').substring(4),
				bars: 'no'
			});

			if (fow_obj != null) {
				fog_of_war_index_constructs();
				fog_of_war_update(fow_obj);
			}
			break;
		case 'duplicate':
			var pos = object_position(obj);
			object_create($(this), pos.left + grid_cell_size, pos.top);
			break;
		case 'fow':
			if (fow_obj == null) {
				if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
					var distance = $('div.fog_of_war').attr('distance');

					if ((distance = prompt('Fog of War distance:', distance)) != undefined) {
						distance = parseInt(distance);
						if (isNaN(distance)) {
							write_sidebar('Invalid distance.');
							break;
						} else if (distance < 1) {
							write_sidebar('Invalid distance.');
							break;
						}

						fog_of_war_init(LAYER_FOG_OF_WAR);
						fog_of_war_set_distance(distance);
					}
				} else {
					fog_of_war_init(LAYER_FOG_OF_WAR);
				}

				fog_of_war_update(obj);
				fow_obj = obj;
			} else if (obj.is(fow_obj)) {
				fog_of_war_destroy();
				fow_obj = null;
			} else {
				fog_of_war_update(obj);
				fow_obj = obj;
			}
			break;
		case 'info':
			object_info(obj);
			break;
		case 'light_create':
			var pos_x = Math.round(coord_to_grid(mouse_x, false) / grid_cell_size);
			var pos_y = Math.round(coord_to_grid(mouse_y, false) / grid_cell_size);

			var wf_light_create = $('<div><label for="light_new">Light radius:</label><input id="light_new" type="text" value="3" class="form-control" /></div>').windowframe({
				width: 530,
				style: 'danger',
				header: 'Create light',
				buttons: {
					'Create': function() {
						var radius = parseInt($('input#light_new').val());

						if (isNaN(radius)) {
							write_sidebar('Invalid radius.');
							return;
						} else if (radius < 0) {
							write_sidebar('Invalid radius (negative).');
							return;
						} else if (radius > 250) {
							write_sidebar('Invalid radius (too large).');
							return;
						}

						light_create(pos_x, pos_y, radius);

						$(this).close();
					},
					'Cancel': function() {
						$(this).close();
					}
				},
				open: function() {
					$('input#light_new').focus();
				},
				close: function() {
					wf_light_create.destroy();
				}
			});

			wf_light_create.open();
			break;
		case 'light_radius':
			var radius = obj.attr('radius');
			
			wf_light_edit = $('<div><label for="light_edit">Light radius:</label><input id="light_edit" type="text" value="' + radius + '" class="form-control" /></div>').windowframe({
				width: 530,
				style: 'danger',
				header: 'Edit light',
				buttons: {
					'Set': function() {
						var radius = parseInt($('input#light_edit').val());

						if (isNaN(radius)) {
							write_sidebar('Invalid radius.');
							return;
						} else if (radius < 0) {
							write_sidebar('Invalid radius (negative).');
							return;
						} else if (radius > 250) {
							write_sidebar('Invalid radius (too large).');
							return;
						}

						$.post('/object/light_radius', {
							light_id: obj.prop('id').substring(5),
							radius: radius
						}).done(function(data) {
							obj.attr('radius', radius);
							obj.attr('title', 'Radius: ' + obj.attr('radius'));

							if (fow_obj != null) {
								fog_of_war_update(fow_obj);
							}
						});
						$(this).close();
					},
					'Cancel': function() {
						$(this).close();
					}
				},
				open: function() {
					$('input#light_edit').focus();
				},
				close: function() {
					wf_light_edit.destroy();
				}
			});

			wf_light_edit.open();
			break;
		case 'light_toggle':
			var light_id = obj.prop('id').substring(5);
			var toggle = { on:'off', off:'on' };
			var state = toggle[obj.attr('state')];

			light_set(light_id, state);
			break;
		case 'presence':
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
			break;
		case 'hitpoints':
			object_hitpoints(obj);
			break;
		case 'lower':
			z_index--;
			obj.css('z-index', z_index);
			break;
		case 'name':
			object_name(obj);
			break;
		case 'rotate':
			var compass = { 'n':   0, 'ne':  45, 'e':  90, 'se': 135,
			                's': 180, 'sw': 225, 'w': 270, 'nw': 315 };
			if ((direction = compass[direction]) != undefined) {
				object_rotate_command(obj, direction);
			}
			break;
		case 'script':
			$('div.script_editor input#zone_id').val($(this).prop('id'));
			$('div.script_editor input#zone_group').val($(this).attr('group'));
			$('div.script_editor textarea').val($(this).find('div.script').text());
			zone_group_change(true);
			wf_script_editor.open();
			$('div.script_editor textarea').focus();
			break;
		case 'wall_create':
		case 'window_create':
			wall_create_command(key);
			break;
		case 'zone_create':
			blinder_stop();
			door_stop();
			wall_stop();

			zone_x = coord_to_grid(mouse_x, false);
			zone_y = coord_to_grid(mouse_y, false);

			if ((measure_diff_x > 0) && (measure_diff_y > 0)) {
				$('div.zone_create input#width').val(measure_diff_x + 1);
				$('div.zone_create input#height').val(measure_diff_y + 1);

				measure_diff_x = 0;
				measure_diff_y = 0;
			}
			measuring_stop();

			wf_zone_create.open();
			$('div.zone_create div.panel-body').prop('scrollTop', 0);
			break;
		default:
			write_sidebar('Unknown menu option: ' + key);
	}
}

/* Main
 */
$(document).ready(function() {
	adventure_id = parseInt($('div.playarea').attr('adventure_id'));
	map_id = parseInt($('div.playarea').attr('map_id'));
	map_width = $('div.playarea > div').width();
	map_height = $('div.playarea > div').height();
	resources_key = parseInt($('div.playarea').attr('resources_key'));
	grid_cell_size = parseInt($('div.playarea').attr('grid_cell_size'));
	grid_size = parseFloat($('div.playarea').attr('grid_size'));
	grid_factor = grid_size / Math.floor(grid_size);
	fow_type = parseInt($('div.fog_of_war').attr('type'));

	/* Show grid
	 */
	if ($('div.playarea').attr('show_grid') == 'yes') {
		grid_init(grid_cell_size);
	}

	/* Map offset
	 */
	var map_offset_x = parseInt($('div.playarea').attr('offset_x'));
	var map_offset_y = parseInt($('div.playarea').attr('offset_y'));

	if ((map_offset_x > 0) || (map_offset_y > 0)) {
		var map = $('div.playarea div:first video');
		if (map.length == 0) {
			map = $('div.playarea div').first();
			map.css('background-position', '-' + map_offset_x + 'px -' + map_offset_y + 'px');
		} else {
			map.css('margin-left', '-' + map_offset_x + 'px');
			map.css('margin-top', '-' + map_offset_y + 'px');
		}
	}

	/* Player start position
	 */
	$('div#start').draggable({
		handle: 'img',
		stop: function(event, ui) {
			object_move($(this));
		}
	});

	/* Mouse down on tokens and characters for icon selector
	 */
	$('div.token, div.character').on('mousedown', object_mouse_down);

	/* Select multiple tokens and characters.
	 */
	$('div.playarea').on('mousedown', function(event) {
		$('div.token, div.character').removeClass('selected');

		if ((event.which != 2) || (ctrl_down == false)) {
			return true;
		}

		if ($('div.playarea div.icon-selector').length > 0) {
			return true;
		}

		context_menu_remove();

		$('div.playarea').append('<div class="icon-selector"></div>');
		$('div.icon-selector').css('z-index', DEFAULT_Z_INDEX);

		var scr = screen_scroll();
		var icon_selector_x1 = event.clientX + scr.left - 16;
		var icon_selector_y1 = event.clientY + scr.top - 41;
		var icon_selector_x2 = icon_selector_x1;
		var icon_selector_y2 = icon_selector_y1;

		$('div.playarea').on('mousemove', function(event) {
			var scr = screen_scroll();
			icon_selector_x2 = event.clientX + scr.left - 16;
			icon_selector_y2 = event.clientY + scr.top - 41;

			$('div.icon-selector').css({
				left: Math.min(icon_selector_x1, icon_selector_x2),
				top: Math.min(icon_selector_y1, icon_selector_y2),
				width: Math.abs(icon_selector_x1 - icon_selector_x2) + 'px',
				height: Math.abs(icon_selector_y1 - icon_selector_y2) + 'px'
			});
		});

		$('div.playarea').one('mouseup mouseleave', function() {
			$('div.playarea').off('mousemove');
			$('div.playarea').off('mouseup');
			$('div.playarea div.icon-selector').remove();

			var x1 = Math.min(icon_selector_x1, icon_selector_x2);
			var y1 = Math.min(icon_selector_y1, icon_selector_y2);
			var x2 = Math.max(icon_selector_x1, icon_selector_x2);
			var y2 = Math.max(icon_selector_y1, icon_selector_y2);

			$('div.token, div.character').each(function() {
				if ($(this).hasClass('ui-draggable') == false) {
					return true;
				}

				var pos = object_position($(this));
				var x = pos.left + Math.round($(this).find('img').width() / 2);
				var y = pos.top + Math.round($(this).find('img').height() / 2);

				if ((x >= x1) && (x <= x2) && (y >= y1) && (y <= y2)) {
					$(this).addClass('selected');
				}
			});
		});

		return false;
	});

	/* Drag map
	 */
	$('div.playarea').on('mousedown', function(event) {
		if ((event.button != 1) || ctrl_down) {
			return true;
		}

		context_menu_remove();

		$('div.playarea').css('cursor', 'grab');

		var scr = screen_scroll();
		var from_x = event.clientX + scr.left - 16;
		var from_y = event.clientY + scr.top - 41;

		$('div.playarea').on('mousemove', function(event) {
			var scr = screen_scroll();
			var to_x = event.clientX + scr.left - 16;
			var to_y = event.clientY + scr.top - 41;

			var dx = from_x - to_x;
			var dy = from_y - to_y;

			$('div.playarea').scrollLeft(scr.left + dx);
			$('div.playarea').scrollTop(scr.top + dy);
		});

		var map_move_stop = function() {
			$('div.playarea').css('cursor', 'default');
			$('div.playarea').off('mousemove');
		};

		$('div.playarea').one('mouseup', map_move_stop);
		$('div.playarea').one('mouseleave', map_move_stop);

		return false;
	});

	/* Windows
	 */
	$('div.windows > div').css('z-index', LAYER_MENU);

	/* Blinders
	 */
	$('div.blinder').each(function() {
		blinder_position($(this));
	});

	$('div.blinder').on('contextmenu', function(event) {
		var menu_entries = {
			'delete': { name:'Delete', icon:'fa-trash' },
			'blinder_create': { name:'Create blinder', icon:'fa-eye-slash' }
		};

		context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
		return false;
	});

	$('div.blinder').on('dblclick', function() {
		if (shift_down) {
			object_delete($(this));
		}
	});

	/* Doors
	 */
	$('div.door').each(function() {
		door_position($(this));
	});

	$('div.door').on('dblclick', function() {
		if (shift_down) {
			object_delete($(this));
		}
	});

	$('div.door').on('contextmenu', function(event) {
		var menu_entries = {};

		if ($(this).attr('state') == 'closed') {
			menu_entries['door_open'] = { name:'Open', icon:'fa-toggle-on' };
		} else {
			menu_entries['door_close'] = { name:'Close', icon:'fa-toggle-off' };
		}

		if ($(this).attr('secret') == 'yes') {
			menu_entries['door_normal'] = { name:'Normal', icon:'fa-eye' };
		} else {
			menu_entries['door_secret'] = { name:'Secret', icon:'fa-eye-slash' };
		}

		if ($(this).attr('bars') == 'yes') {
			menu_entries['door_solid'] = { name:'Solid', icon:'fa-square' };
		} else {
			menu_entries['door_bars'] = { name:'Bars', icon:'fa-table' };
		}

		menu_entries['sep'] = '-';
		menu_entries['delete'] = { name:'Delete', icon:'fa-trash' };

		context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
		return false;
	});

	/* Lights
	 */
	$('img.light').each(function() {
		$(this).draggable({
			stop: function(event, ui) {
				object_move($(this));
			}
		});
		$(this).attr('title', 'Radius: ' + $(this).attr('radius'));
	});

	$('img.light').on('contextmenu', function(event) {
		var menu_entries = {
			'light_radius': { name:'Set radius', icon:'fa-dot-circle-o' }
		};

		if ($(this).attr('state') == 'on') {
			menu_entries['light_toggle'] = { name:'Turn off', icon:'fa-toggle-off' };
		} else {
			menu_entries['light_toggle'] = { name:'Turn on', icon:'fa-toggle-on' };
		}

		menu_entries['delete'] = { name:'Delete', icon:'fa-trash' };

		context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
		return false;
	});

	/* Script
	 */
	wf_script_editor = $('div.script_editor').windowframe({
		width:500,
		header: 'Event script',
		buttons: {
			'Save': function() {
				script_save();
				$(this).close();
			},
			'Cancel': function() {
				$(this).close();
			},
			'Help': function() {
				wf_script_manual.open();
			}
		}
	});

	wf_script_manual = $('div.script_manual').windowframe({
		width: 1000,
		header: 'Script manual'
	});

	/* Walls
	 */
	$('div.wall[transparent="yes"]').addClass('window');

	$('div.wall').each(function() {
		wall_position($(this));
	});

	$('div.wall').on('contextmenu', function(event) {
		var menu_entries = {
			'delete': { name:'Delete', icon:'fa-trash' },
			'blinder_create': { name:'Create blinder', icon:'fa-eye-slash' }
		};

		context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
		return false;
	});

	$('div.wall').on('dblclick', function() {
		if (shift_down) {
			object_delete($(this));
		}
	});

	/* Zones
	 */
	$('div.zone').draggable({
		stop: function(event, ui) {
			object_move($(this));
		},
	});

	$('div.zone').hover(zone_group_highlight, zone_group_unhighlight);

	zone_init_presence();

	wf_zone_create = $('div.zone_create').windowframe({
		width: 450,
		header: 'Create zone',
		buttons: {
			'Create': function() {
				var width = parseInt($('input#width').val());
				var height = parseInt($('input#height').val());
				var color = $('input#color').val();
				var opacity = parseFloat($('input#opacity').val());
				var group = $('input#group').val();
				var altitude = parseInt($('input#altitude').val());

				if (isNaN(width)) {
					write_sidebar('Invalid width.');
					return;
				} else if (isNaN(height)) {
					write_sidebar('Invalid height.');
					return;
				} else if (isNaN(opacity)) {
					write_sidebar('Invalid opacity.');
					return;
				} else if (isNaN(altitude)) {
					write_sidebar('Invalid altitude.');
					return;
				}

				if (color.substr(0, 1) != '#') {
					write_sidebar('Invalid color.');
					return;
				}

				if (opacity < 0) {
					opacity = 0;
				} else if (opacity > 1) {
					opacity = 1;
				}

				if ((altitude < 0) || (altitude > 250)) {
					write_sidebar('Altitude out of range (0 - 250).');
					return;
				}

				zone_x -= Math.floor((width - 1) / 2) * grid_cell_size;
				if (zone_x < 0) {
					zone_x = 0;
				}

				zone_y -= Math.floor((height - 1) / 2) * grid_cell_size;
				if (zone_y < 0) {
					zone_y = 0;
				}

				zone_create(width, height, color, opacity, group, altitude);

				$(this).close();
			},
			'Cancel': function() {
				$(this).close();
			}
		}
	});

	$('div.zone').on('contextmenu', function(event) {
		var menu_entries = {
			'info': { name:'Get information', icon:'fa-info-circle' },
			'script': { name:'Edit event script', icon:'fa-edit' },
			'sep1': '-',
			'distance': { name:'Measure distance', icon:'fa-map-signs' },
			'coordinates': { name:'Get coordinates', icon:'fa-flag' },
			'sep2': '-',
			'delete': { name:'Delete', icon:'fa-trash' }
		};

		context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
		return false;
	});

	$('div.script_editor div.panel').draggable({
		handle: 'div.panel-heading',
		cursor: 'grab'
	});

	$('div.script_manual div.panel').draggable({
		handle: 'div.panel-heading',
		cursor: 'grab'
	});

	/* Objects
	 */
	$('div.token[is_hidden=no]').each(function() {
		$(this).show();
	});

	$('div.token').each(function() {
		$(this).css('z-index', LAYER_TOKEN);
		object_rotate_action($(this), $(this).attr('rotation'));
	});

	$('div.character').each(function() {
		$(this).css('z-index', LAYER_CHARACTER);
		object_rotate_action($(this), $(this).attr('rotation'));
	});

	$('div.token, div.character').draggable({
		containment: 'div.playarea > div',
		handle: 'img',
		start: object_drag_start,
		drag: object_drag_drag,
		stop: object_drag_stop
	});

	$('div.token[is_hidden=yes]').each(function() {
		$(this).fadeTo(0, OBJECT_HIDDEN_FADE);
	});

	$('div.character[is_hidden=yes]').each(function() {
		$(this).fadeTo(0, OBJECT_HIDDEN_FADE);
	});

	object_token_context_menu($('div.token'));

	$('div.character img').on('contextmenu', function(event) {
		$('div.selected').removeClass('selected');

		var menu_entries = {
			'info': { name:'Get information', icon:'fa-info-circle' },
			'presence': { name:'Toggle presence', icon:'fa-low-vision' },
			'rotate': { name:'Rotate', icon:'fa-compass', items:{
				'rotate_n':  { name:'North', icon:'fa-arrow-circle-up' },
				'rotate_ne': { name:'North East' },
				'rotate_e':  { name:'East', icon:'fa-arrow-circle-right' },
				'rotate_se': { name:'South East' },
				'rotate_s':  { name:'South', icon:'fa-arrow-circle-down' },
				'rotate_sw': { name:'South West' },
				'rotate_w':  { name:'West', icon:'fa-arrow-circle-left' },
				'rotate_nw': { name:'North West' },
			}},
			'fow': { name:'Toggle Fog of War', icon:'fa-cloud' },
			'sep1': '-',
			'distance': { name:'Measure distance', icon:'fa-map-signs' },
			'coordinates': { name:'Get coordinates', icon:'fa-flag' },
			'sep2': '-',
			'blinder_create': { name:'Create blinder', icon:'fa-eye-slash' },
			'door_create': { name:'Create door', icon:'fa-columns' },
			'wall_create': { name:'Create wall', icon:'fa-th-large' },
			'window_create': { name:'Create window', icon:'fa-window-maximize' },
			'zone_create': { name:'Create zone', icon:'fa-square-o' }
		};

		context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
		return false;
	});

	$('div.playarea > div').on('click', function(event) {
		if ($('div.playarea div#new_blinder').length > 0) {
			return;
		}

		if ($('div.playarea div#new_wall').length > 0) {
			return;
		}

		if (ctrl_down == false) {
			return;
		}

		capture_mouse_position(event)

		switch (construct_last_type){
			case 'blinder':
				blinder_create_command();
				break;
			case 'door':
				door_create_command();
				break;
			case 'wall':
				wall_create_command('wall_create');
				break;
			case 'window':
				wall_create_command('window_create');
				break;
		}
	});

	$('div.playarea > div').on('contextmenu', function(event) {
		var menu_entries = {
			'distance': { name:'Measure distance', icon:'fa-map-signs' },
			'coordinates': { name:'Get coordinates', icon:'fa-flag' },
			'sep1': '-',
			'blinder_create': { name:'Create blinder', icon:'fa-eye-slash' },
			'door_create': { name:'Create door', icon:'fa-columns' },
			'light_create': { name:'Create light', icon:'fa-lightbulb-o' },
			'wall_create': { name:'Create wall', icon:'fa-th-large' },
			'window_create': { name:'Create window', icon:'fa-window-maximize' },
			'zone_create': { name:'Create zone', icon:'fa-square-o' }
		};

		if ((fow_type != FOW_NIGHT_CELL) && (fow_type != FOW_NIGHT_REAL)) {
			delete menu_entries['light_create'];
		}

		context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
		return false;
	});

	$('div.collectables div.panel').draggable({
		handle: 'div.panel-heading',
		cursor: 'grab'
	});

	/* Menu
	 */
	$('button.open_menu').on('click', function(event) {
		$('div.menu').toggle();
		$('body').one('click', function() {
			$('div.menu').hide();
		});
		event.stopPropagation();
	});
	$('div.menu').on('click', function(event) {
		event.stopPropagation();
	});
	$('div.menu button').on('click', function(event) {
		$('div.menu').hide();
	});

	$('div.menu').css('z-index', LAYER_MENU);

	/* Library
	 */
	$('div.library img.icon').draggable({
		helper: 'clone',
		appendTo: 'div.content',
		scroll: false,
		start: function(event, ui) {
			var width = parseInt($(this).attr('obj_width')) * grid_cell_size;
			var height = parseInt($(this).attr('obj_height')) * grid_cell_size;
			ui.helper.css('width', width + 'px');
			ui.helper.css('max-width', width + 'px');
			ui.helper.css('height', height + 'px');
			ui.helper.css('max-height', height + 'px');
		},
		stop: function(event, ui) {
			var x = (event.pageX > 0) ? event.pageX : 0;
			var y = (event.pageY > 0) ? event.pageY : 0;
			object_create($(this), x, y);
		}
	});

	/* Capture right mouse click
	 */
	$('div.playarea').mousedown(function(event) {
		if (event.which == 3) {
			capture_mouse_position(event);
		}
	});

	$('body').keydown(key_down);
	$('body').keyup(key_up);

	$(window).focus(function() {
		ctrl_down = false;
		shift_down = false;
		alt_down = false;
	});

	$('input#filter').val(localStorage.getItem('vault_token_filter'));
	filter_library();

	write_sidebar('While creating a blinder, wall or window, hold CTRL to create consecutive constructs.');
	write_sidebar('Press ALT to get blinders off the grid. Add SHIFT to make them horizontal or vertical.');
	write_sidebar('Double-click a blinder, door, wall or window while holding SHIFT to delete the construct.');
});
