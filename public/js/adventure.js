const FOW_NONE = 0;
const FOW_DAY_CELL = 1;
const FOW_DAY_REAL = 2;
const FOW_NIGHT_CELL = 3;
const FOW_NIGHT_REAL = 4;
const FOW_REVEAL = 5;

const DEFAULT_Z_INDEX = 1000;
const LAYER_NIGHT = DEFAULT_Z_INDEX;
const LAYER_DRAWING = DEFAULT_Z_INDEX + 1;
const LAYER_GRID = DEFAULT_Z_INDEX + 2;
const LAYER_ZONE = DEFAULT_Z_INDEX + 3;
const LAYER_EFFECT = DEFAULT_Z_INDEX + 4;
const LAYER_TOKEN = DEFAULT_Z_INDEX + 5;
const LAYER_CONSTRUCT = DEFAULT_Z_INDEX + 6;
const LAYER_LIGHT = DEFAULT_Z_INDEX + 7;
const LAYER_CHARACTER = DEFAULT_Z_INDEX + 8;
const LAYER_CHARACTER_OWN = DEFAULT_Z_INDEX + 9;
const LAYER_FOG_OF_WAR = DEFAULT_Z_INDEX + 10;
const LAYER_MARKER = DEFAULT_Z_INDEX + 11;
const LAYER_MENU = DEFAULT_Z_INDEX + 12;
const LAYER_VIEW = DEFAULT_Z_INDEX + 20000;

const DOOR_SECRET = '#a0a000';
const DOOR_OPEN = '#40c040';
const DOOR_OPACITY = '0.6';

const OBJECT_HIDDEN_FADE = 0.6;

const INPUT_HISTORY_SIZE = 20;

const DRAW_DEFAULT_COLOR = 1;
const DRAW_DEFAULT_WIDTH = 5;
const DRAW_ERASE_THIN = 25;
const DRAW_ERASE_THICK = 75;

const CHAR_POS_SAVE_DELAY = 2;

var websocket;
var group_key = null;
var adventure_id = null;
var map_id = null;
var user_id = null;
var character_id = null;
var resources_key = null;
var grid_cell_size = null;
var map_width = null;
var map_height = null;
var dungeon_master = null;
var my_name = null;
var character_name = null;
var character_steerable = true;
var my_character = null;
var wf_attack = null;
var wf_audio_player = null;
var wf_collectables = null;
var wf_effect_create = null;
var wf_journal = null;
var wf_pictures = null;
var wf_zone_create = null;
var wf_entry_edit = null;
var keep_centered = true;
var focus_obj = null;
var fow_type = null;
var fow_obj = null;
var fow_map_distance = null;
var input_history = null;
var input_index = -1;
var mouse_x = 0;
var mouse_y = 0;
var night_level = 0;
var effect_counter = 1;
var effect_x = 0;
var effect_y = 0;
var zone_presence = [];
var zone_x = 0;
var zone_y = 0;
var zone_menu = null;
var menu_defaults = {
	root: 'div.playarea',
	z_index: LAYER_MENU
};
var ctrl_down = false;
var shift_down = false;
var alt_down = false;
var drawing_canvas = null;
var drawing_ctx = null;
var drawing_history = [];
var drawing_mode = 'source-over';
var fullscreen = false
var fullscreen_backup = undefined;
var pause = false;
var ruler_distance = 0;
var ruler_previous = 0;
var key_to_direction = null;
var brushes = {};
var sea_submenu = null;
var mobile_device = false;
var player_notes = null;

var char_pos_x = 0;
var char_pos_y = 0;
var char_pos_changed = false

/* Websocket
 */
function websocket_send(data) {
	if (websocket == null) {
		return;
	}

	data.adventure_id = adventure_id;
	data.map_id = map_id;
	data.from_user_id = user_id;
	data = JSON.stringify(data);

	websocket.send(data);
}

function map_switch() {
	$.post('/object/change_map', {
		adventure_id: adventure_id,
		map_id: $('select.map-selector').val()
	}).done(function() {
		var data = {
			action: 'reload'
		};
		websocket_send(data);

		document.location = '/adventure/' + adventure_id;
	});
}

function map_image() {
	$.ajax('/adventure/maps').done(function(data) {
		var maps = '<div><ul class="map_image">';
		$(data).find('maps map').each(function() {
			maps += '<li>/' + $(this).text() + '</li>';
		});
		maps += '</ul></div>';

		var wf_map_dialog = $(maps).windowframe({
			header: 'Maps from Resources',
			info: 'This tool allows you to only change the battle map image or video. You can use it when you have multiple maps of the same scenery, but with small changes.',
			close: function() {
				wf_map_dialog.destroy();
			}
		});

		$('ul.map_image li').on('click', function() {
			var map_url = url_encode($(this).text());
			var resources_key = $('div.playarea').attr('resources_key');

			map_url = map_url.substr(0, 11) + resources_key + map_url.substr(10);
			wf_map_dialog.close();

			var data = {
				action: 'map_image',
				url: map_url
			};
			websocket_send(data);

			var image = $('<img src="' + map_url + '" />');
			image.one('load', function() {
				$('div#map_background').css('background-image', 'url(' + map_url + ')');
				delete image;
			});
		});

		wf_map_dialog.open();
	});
}

function screen_scroll() {
	var scr = {};

	scr.left = Math.round($('div.playarea').scrollLeft());
	scr.top = Math.round($('div.playarea').scrollTop());

	return scr;
}

function store_mouse_position(event) {
	var mac = (window.navigator.platform == 'MacIntel');
	if ((event.which == 3) || (mac && (event.which == 1) && (ctrl_down))) {
		var scr = screen_scroll();
		mouse_x = event.clientX + scr.left - 16;
		mouse_y = event.clientY + scr.top - 41;
	}
}

function scroll_to_my_character(speed = 1000) {
	var pos_x = -($('div.playarea').width() >> 1);
	var pos_y = -($('div.playarea').height() >> 1);

	if (my_character != null) {
		var spot = my_character;
	} else if (focus_obj != null) {
		var spot = focus_obj;
	} else if ($('div.character').length > 0) {
		var spot = $('div.character').first();
	}

	if (typeof spot !== 'undefined') {
		var pos = object_position(spot);
	} else {
		var pos = {
			left: parseInt($('div.playarea').attr('start_x')) * grid_cell_size,
			top:  parseInt($('div.playarea').attr('start_y')) * grid_cell_size
		};
	}

	pos_x += pos.left + (grid_cell_size >> 1);
	pos_y += pos.top + (grid_cell_size >> 1);

	$('div.playarea').animate({
		scrollLeft: pos_x,
		scrollTop:  pos_y
	}, speed);
}

function toggle_fullscreen() {
	var playarea = $('div.playarea');

	if (fullscreen == false) {
		fullscreen_backup = playarea.css('bottom');
		playarea.css({
			top: 0,
			right: 0,
			bottom: 0,
			left: 0
		});
		$('div.draw-tools').hide();

		fullscreen = true;
	} else {
		playarea.removeAttr('style');
		if (fullscreen_backup != undefined) {
			playarea.css('bottom', fullscreen_backup);
		}
		$('div.draw-tools').show();

		fullscreen = false;
		fullscreen_backup = undefined;
	}

	playarea.trigger('focus');
}

function write_sidebar(message) {
	var sidebar = $('div.sidebar');
	message = message.replace(/\n/g, '<br />');
	sidebar.append('<p>' + message + '</p>');
	sidebar.prop('scrollTop', sidebar.prop('scrollHeight'));

	$('div.sidebar_expanded').append('<p>' + message + '</p>');
}

function show_image(img) {
	if ($('div.image_overlay').length > 0) {
		return;
	}

	var image = '<div class="image_overlay" onClick="javascript:$(this).remove()"><img src="' + $(img).attr('src') + '" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); filter:drop-shadow(#000000 10px 10px 5px); max-width:80%; max-height:80%; cursor:pointer" draggable="false" /></div>';

	$('body').append(image);
	$('body div.image_overlay').show();
}

function make_spell_link(text, offset) {
	var spell = text.substring(offset);
	var link = spell.replace(/'/g, '\\\'').replace(/"/g, '');

	return '<a href="javascript:show_spells(\'' + link + '\')">' + spell + '</a>';
}

function message_to_sidebar(message, name = null) {
	/* Special messages
	 */
	if ((message.substring(0, 7) == 'http://') || (message.substring(0, 8) == 'https://')) {
		var parts = message.split('.');
		var extension = parts.pop();
		var images = ['gif', 'jpg', 'jpeg', 'png', 'webp'];

		if (images.includes(extension)) {
			message = '<img src="' + message + '" style="cursor:pointer;" onClick="javascript:show_image(this)" draggable="false" />';
		} else {
			message = '<a href="' + message + '" target="_blank">' + message + '</a>';
		}
	} else if (message.substring(0, 9) == 'Casting: ') {
		message = 'Casting ' + make_spell_link(message, 9) + '.';
	} else {
		message = message.replace(/</g, '&lt;');

		/* BB codes
		 */
		var pos = 0;
		while ((begin = message.indexOf('[', pos)) != -1) {
			pos = begin + 1;

			if ((end = message.indexOf(']', pos)) == -1) {
				continue;
			}

			var tag = message.substring(pos, end);
			if (/^\d+$/.test(tag)) {
				pos = end + 1;
				continue;
			}

			pos = end + 1;

			var params = null;
			var content = null;

			if ((space = tag.indexOf(' ')) != -1) {
				params = tag.substring(space + 1);
				tag = tag.substring(0, space);
			}

			if ((close = message.indexOf('[/' + tag + ']', end)) != -1) {
				content = message.substring(end + 1, close);
				end = close + tag.length + 2;
			}

			var replacement = (content != null) ? content : '';

			switch (tag) {
				case 'b':
					if (content == null) {
						continue;
					}
					replacement = '<b>' + content + '</b>';
					break;
				case 'target':
					if ((params == null) || (content == null)) {
						continue;
					}

					var mouse_over = 'onMouseOver="javascript:highlight_target(\'' + params + '\')"';
					var mouse_out = 'onMouseOut="javascript:unhighlight_target(\'' + params + '\')"';
					replacement = '<span ' + mouse_over + '' + mouse_out + ' class="target">' + content + '</span>';
					break;
				case 'spell':
					if (content == null) {
						continue;
					}

					var link = content.replace(/'/g, '\\\'').replace(/"/g, '');

					replacement = '<a href="javascript:show_spells(\'' + link + '\')">' + content + '</a>';
					break;
				default:
					continue;
			}

			message = message.substring(0, begin) + replacement + message.substring(end + 1);
			pos = begin + replacement.length;
		}
	}

	if (name != null) {
		message = '<b>' + name + ':</b><span style="display:block; margin-left:15px;">' + message + '</span>';
	}

	write_sidebar(message);
}

function highlight_target(object_id) {
	var obj = $('div#' + object_id);

	obj.addClass('target');

	if (obj.hasClass('zone')) {
		obj.attr('opacity', obj.css('opacity'));
		obj.css('opacity', 0.75);
	}
}

function unhighlight_target(object_id) {
	var obj = $('div#' + object_id);

	obj.removeClass('target');

	if (obj.hasClass('zone')) {
		obj.css('opacity', obj.attr('opacity'));
		obj.removeAttr('opacity');
	}
}

function send_message(message, name, write_to_sidebar = true) {
	var data = {
		action: 'say',
		name: name,
		mesg: message
	};
	websocket_send(data);

	if (write_to_sidebar) {
		message_to_sidebar(message, name);
	}
}

function input_history_add(input) {
	input_history = jQuery.grep(input_history, function(value) {
		return value != input;
	});

	input_history.unshift(input);
	input_history = input_history.slice(0, INPUT_HISTORY_SIZE);
	input_index = -1;

	localStorage.setItem('input_history', JSON.stringify(input_history));
}

function show_help() {
	var commands = {
		'clear':                     'Clear this sidebar.',
		'd20 [&lt;bonus&gt]':        'Roll d20 dice.',
		'd20a [&lt;bonus&gt]':       'Roll d20 dice with advantage.',
		'd20d [&lt;bonus&gt]':       'Roll d20 dice with disadvantage.',
		'dicecolor #&lt;rrggbb&gt;': 'Change the color of the 3D dice.',
		'fow [&lt;option&gt;]':            'Change Fog of War settings.',
		'history [clear]':           'Show or clear your input history.',
		'labels hide|show':          'Manage character name labels and health bars visibility.',
		'log &lt;message&gt;':       'Add message to journal.',
		'roll &lt;dice&gt;':         'Roll one or more dice.',
		'whisper &lt;name&gt;|dm &lt;message&gt;': 'Send a message to a specific player or character or the Dungeon Master.'
	};

	var extra = dungeon_master ? {
		'add &lt;name&gt;':      'Add NPC to the combat and make it its turn.',
		'combat':                'Start a new combat.',
		'dmroll &lt;dice&gt;':   'Privately roll dice.',
		'done':                  'End the combat.',
		'next [&lt;name&gt;]':   'Next turn in combat.',
		'night 0-4':             'Set map night mode.',
		'noscript':              'Disable all zone scripts.',
		'ping':                  'See who\'s online in the session.',
		'reload':                'Force everyone in the session to reload the map.',
		'remove &lt;name&gt;':   'Remove one from the combat.',
		'walls hide|show':       'Manage walls and windows visibility.'
	} : {
		'damage &lt;points&gt;': 'Damage your character.',
		'heal &lt;points&gt;':   'Heal your character.'
	};

	var help = [];
	Object.assign(commands, extra);
	for (const [key, value] of Object.entries(commands)) {
		help.push('<span class="help"><b>/' + key + '</b>: ' + value + '</span>');
	}

	help.sort();

	help.push('<span class="help"><b>&lt;message&gt;</b>: Send text message.</span><br />');
	help.push('Right-click an icon or the map for a menu with options.');
	help.push('Use the middle mouse button to move the map.');
	help.push('Holding the CTRL key while using the middle mouse button allows you to select multiple tokens and characters.');
	help.push('Holding CTRL while clicking the sidebar shows its content in a larger window.');

	write_sidebar(help.join('\n'));
}

function coord_to_grid(coord, edge = true) {
	var delta = coord % grid_cell_size;
	coord -= delta;

	if (edge && (delta > (grid_cell_size >> 1))) {
		coord += grid_cell_size;
	}

	return coord;
}

function center_character(button) {
	if (keep_centered == false) {
		keep_centered = true;
		if ((my_character != null) || (focus_obj != null)) {
			scroll_to_my_character(0);
		}
		$(button).addClass('btn-primary');
		$(button).removeClass('btn-default');
	} else {
		keep_centered = false;
		$(button).removeClass('btn-primary');
		$(button).addClass('btn-default');
	}

	$(button).blur();
}

function interface_color(button, swap = true) {
	var color = localStorage.getItem('interface_color');

	if (color == undefined) {
		color = 'bright';
	}

	if (swap) {
		color = (color == 'bright') ? 'dark' : 'bright';
	}

	if (color == 'dark') {
		$('div.wrapper').addClass('dark');
		$(button).text('Bright interface');
		localStorage.setItem('interface_color', 'dark');
	} else {
		$('div.wrapper').removeClass('dark');
		$(button).text('Dark interface');
		localStorage.setItem('interface_color', 'bright');
	}
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

function temporary_hitpoints(points = null) {
	var temporary_hitpoints = localStorage.getItem('temp_hp');

	if (temporary_hitpoints == undefined) {
		temporary_hitpoints = {};
	} else {
		temporary_hitpoints = JSON.parse(temporary_hitpoints);
	}

	if (temporary_hitpoints[character_id] == undefined) {
		temporary_hitpoints[character_id] = 0;
	}

	if (points !== null) {
		temporary_hitpoints[character_id] = points;
	}

	localStorage.setItem('temp_hp', JSON.stringify(temporary_hitpoints));

	if (points === null) {
		return temporary_hitpoints[character_id];
	}
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
		menu_entries['sea'] = sea_submenu;
		menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };

		var hitpoints = parseInt(obj.attr('hitpoints'));
		if (hitpoints > 0) {
			menu_entries['damage'] = { name:'Damage', icon:'fa-warning' };
			menu_entries['heal'] = { name:'Heal', icon:'fa-medkit' };
		}
		menu_entries['armor'] = { name:'Set armor class', icon:'fa-shield' };
		
		var has = obj.find('span.conditions').text().split(',');
		var conditions = {};
		conditions['condition_0'] = { name: 'None' };
		conditions['sep0'] = '-';
		$('div.conditions div').each(function() {
			var con_id = $(this).attr('con_id');
			var name = $(this).text();
			var icon = has.includes(name) ? 'fa-check-square-o' : 'fa-square-o';
			conditions['condition_' + con_id] = { name: name, icon: icon};
		});

		menu_entries['sep4'] = '-';
		menu_entries['conditions'] = { name:'Set condition', icon:'fa-heartbeat', items:conditions};
		menu_entries['sep5'] = '-';
		menu_entries['lower'] = { name:'Lower', icon:'fa-arrow-down' };
		menu_entries['delete'] = { name:'Delete', icon:'fa-trash' };
	}

	context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);

	return false;
}

function object_contextmenu_player(event) {
	$('div.selected').removeClass('selected');

	var menu_entries = {
		'view': { name:'View', icon:'fa-search' },
		'sep1': '-',
		'sea': sea_submenu,
		'attack': { name:'Attack', icon:'fa-legal' },
		'sep2': '-',
		'marker': { name:'Set marker', icon:'fa-map-marker' },
		'distance': { name:'Measure distance', icon:'fa-map-signs' }
	};

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

	var scr = screen_scroll();
	x = coord_to_grid(x + scr.left - 30, false);
	y = coord_to_grid(y + scr.top - 40, false);

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

function object_damage_command(obj, points) {
	var hitpoints = parseInt(obj.attr('hitpoints'));
	var damage = parseInt(obj.attr('damage'));

	if (obj.is(my_character) && (points > 0)) {
		if ((points -= temporary_hitpoints()) <= 0) {
			temporary_hitpoints(-points);
			return;
		}

		temporary_hitpoints(0);
	}

	damage += points;

	if (damage > hitpoints) {
		damage = hitpoints;
	} else if (damage < 0) {
		damage = 0;
	}

	var perc = Math.floor(100 * damage / hitpoints).toString() + '%';

	object_damage_action(obj, damage, perc);

	var data = {
		action: 'damage',
		instance_id: obj.prop('id'),
		damage: damage,
		perc: perc
	};
	websocket_send(data);

	$.post('/object/damage', {
		instance_id: obj.prop('id'),
		damage: damage
	});

	if (dungeon_master) {
		obj.attr('title', 'HP: ' + (hitpoints - damage));
	}
}

function object_damage_action(obj, damage, percentage) {
	obj.attr('damage', damage);
	obj.find('div.damage').css('width', percentage);

	if (percentage == '100%') {
		object_dead(obj);
	} else {
		object_alive(obj);
	}
}

function object_dblclick(event) {
	event.stopPropagation();
	
	object_focus($(this).parent());
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
			info += 'Armor class: ' + obj.attr('armor_class') + '<br />';
		}

		info += 'Max hit points: ' + obj.attr('hitpoints') + '<br />';

		var hitpoints = parseInt(obj.attr('hitpoints'))

		if (hitpoints > 0) {
			var remaining = hitpoints - parseInt(obj.attr('damage'));
			info +=
				'Damage: ' + obj.attr('damage') + '<br />' +
				'Hit points: ' + remaining.toString() + '<br />';
		}

		if (obj.is(my_character)) {
			info += 'Temp, hit points: ' + temporary_hitpoints().toString() + '<br />';
		}

		if (obj.hasClass('character')) {
			info += 'Initiative bonus: ' + obj.attr('initiative') + '<br />';

			if (dungeon_master) {
				var vision = character_vision(obj);
				if (vision == 0) {
					vision = 'infinite';
				}
				info += 'Vision distance: ' + vision + '<br />';

				info += 'Light radius: ' + obj.attr('light') + '<br />';
			}
		}

		var conditions = obj.find('span.conditions');
		if (conditions.length > 0) {
			conditions = conditions.html().replace(/>/g, '>- ');
			info += 'Conditions:<br />- ' + conditions;
		}
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
	var pos = obj.position();
	pos.left = Math.round(pos.left);
	pos.top = Math.round(pos.top);

	var scr = screen_scroll();
	pos.left += scr.left;
	pos.top += scr.top;

	return pos;
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

/* Collectable functions
 */
function collectables_show() {
	$.post('/object/collectables/found', {
		adventure_id: adventure_id,
	}).done(function(data) {
		var body = wf_collectables.body();
		body.empty();

		if ($(data).find('collectable').length == 0) {
			var spider = '<img src="/images/spider_web.png" style="float:right; height:100px; margin-bottom:100px; position:relative; top:-15px; right:-15px;" />';
			body.append(spider);
		} else {
			body.append('<div class="row"></div>');
			var row = body.find('div');

			$(data).find('collectable').each(function() {
				var image = $(this).find('image').text();
				var description = $(this).find('description').text();
				description = description.replace(/"/g, '&quot;');

				var collectable = '<div class="col-sm-4" style="width:115px; height:115px;" onClick="javascript:object_view($(this), 1000);"><img src="/resources/' + resources_key + '/collectables/' + image + '" style="max-width:100px; max-height:100px; cursor:pointer;" description="' + description + '" /></div>';
				row.append(collectable);
			});
		}

		var notes = $('<textarea class="form-control notes" maxlength="250" placeholder="Player notes">' + player_notes + '</textarea>');
		notes.on('change', function() {
			var body = wf_collectables.body();
			player_notes = body.find('textarea.notes').val();

			$.post('/object/player_notes', {
				adventure_id: adventure_id,
				notes: player_notes
			});

			var data = {
				action: 'player_notes',
				notes: player_notes
			};
			websocket_send(data);
		});
		body.append(notes);

		if (dungeon_master) {
			$.post('/object/collectables/all', {
				adventure_id: adventure_id,
			}).done(function(data) {
				var collectables = '<div class="all"><table class="table table-condensed"><thead><th>Collectable</th><th>Found</th><th>Explained</th></tr></thead><tbody>';
				$(data).find('collectable').each(function() {
					var col_id = $(this).attr('id');
					var name = $(this).find('name').text();
					var found = $(this).find('found').text();
					var explain = $(this).find('explain').text();
					collectables += '<tr col_id="' + col_id + '"><td>' + name + '</td>' +
						'<td><input name="found" type="checkbox" ' + (found == 'yes' ? 'checked="checked" ' : '') + '/></td>' +
						'<td><input name="explain" type="checkbox" ' + (explain == 'yes' ? 'checked="checked" ' : '') + '/></td></tr>';
				});
				collectables += '</tbody></table></div>';

				body.append(collectables);

				body.find('input').on('click', function() {
					var collectable_id = $(this).parent().parent().attr('col_id');

					$.post('/object/collectable/state', {
						id: collectable_id,
						field: $(this).attr('name'),
						state: $(this).is(':checked')
					});

					if ($(this).attr('name') == 'found') {	
						if ($(this).is(':checked')) {
							collectable_found_command(collectable_id);
						} else {
							collectable_unfound_command(collectable_id);
						}
					}
				});
			});
		}
	});
}

function collectable_found_command(collectable_id) {
	collectable_found_action(collectable_id);

	var data = {
		action: 'found',
		collectable_id: collectable_id
	};

	websocket_send(data);
}

function collectable_found_action(collectable_id) {
	var obj = $('div[c_id="' + collectable_id + '"]');

	obj.attr('c_found', 'yes');

	if (obj.attr('c_hide') == 'yes') {
		object_hide_action(obj);
	}
}

function collectable_unfound_command(collectable_id) {
	collectable_unfound_action(collectable_id);

	var data = {
		action: 'unfound',
		collectable_id: collectable_id
	};

	websocket_send(data);
}

function collectable_unfound_action(collectable_id) {
	var obj = $('div[c_id="' + collectable_id + '"]');

	obj.attr('c_found', 'no');

	if (obj.attr('c_hide') == 'yes') {
		object_show_action(obj);
	}
}

function collectables_reopen_inventory() {
	if ($('div.collectables:visible').length == 0) {
		return;
	}

	$('div#view').remove();
	wf_collectables.close();
	wf_collectables.open();
}

/* Journal functions
 */
function journal_add_entry(name, content, entry_id) {
	content = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
	content = content.replace(/(http(s?):\/\/([^ ]+)\.(gif|jpg|png|webp))/, '<img src="$1" />');

	var entry = '<div class="entry" entry_id="' + entry_id + '"><span class="writer">' + name + '</span><span class="content">' + content + '</span></div>';
	$('div.journal div.entries').append(entry);

	var panel = $('div.journal').parent();
	panel.prop('scrollTop', panel.prop('scrollHeight'));
}

function journal_save_entry(name, content) {
	$.post('/object/journal_add', {
		adventure_id: adventure_id,
		content: content
	}).done(function(data) {
		var entry_id = $(data).find('entry_id').text();

		journal_add_entry(name, content, entry_id);

		var my_entry = $('div.journal div.entry[entry_id=' + entry_id + ']');
		my_entry.css('cursor', 'text');
		my_entry.on('click', function() {
			journal_edit_entry($(this));
		});

		var data = {
			action: 'journal_add',
			entry_id: entry_id,
			name: name,
			content: content
		};
		websocket_send(data);
	});
}

function journal_edit_entry(entry) {
	if (wf_entry_edit != null) {
		wf_entry_edit.destroy();
	}

	if (ctrl_down == false) {
		return;
	}

	var entry_id = entry.attr('entry_id');
	var form = '<div><textarea style="height:200px" class="form-control">' +
		entry.find('span.content').text() +
		'</textarea></div>';

	wf_entry_edit = $(form).windowframe({
		width: 530,
		height: 400,
		style: 'info',
		header: 'Edit journal entry',
		buttons: {
			'Update': function() {
				var content = wf_entry_edit.find('textarea').val().trim();

				$.post('/object/journal_update', {
					entry_id: entry_id,
					content: content
				}).done(function() {
					if (content == '') {
						entry.remove();
					} else {
						entry.find('span.content').text(content);
					}

					var data = {
						action: 'journal_update',
						entry_id: entry_id,
						content: content
					};
					websocket_send(data);
				});

				$(this).close();
			},
			'Cancel': function() {
				$(this).close();
			}
		},
		close: function() {
			wf_entry_edit.destroy();
			wf_entry_edit = null;
		}
	});

	wf_entry_edit.open();
}

function journal_show() {
	var panel = $('div.journal').parent();
	panel.prop('scrollTop', panel.prop('scrollHeight'));

	$('div.journal textarea').focus();
}

function journal_write() {
	var textarea = $('div.journal textarea');
	var content = textarea.val().trim();
	textarea.val('');

	if (content == '') {
		return;
	}

	journal_save_entry(character_name, content);
	textarea.focus();
}

function journal_filter_reset() {
	$('div.journal').unmark();
}

function journal_filter_adjust() {
	journal_filter_reset();

	var filter = $('div.journal input[type="text"]').val().toLowerCase();
	if (filter == '') {
		return;
	}

	var mark_options = { separateWordSearch: false };

	$('div.journal div.entry').each(function() {
		$(this).mark(filter, mark_options);
	});
}

function journal_filter_clear() {
	$('div.journal input[type="text"]').val('');

	journal_filter_reset();
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

/* Input functions
 */
function handle_input(input) {
	input = input.trim();

	if (input == '') {
		return;
	}

	if (input.substring(0, 1) != '/') {
		input = input.replace(/ +/g, ' ');
		if (input.substring(0, 9).toLowerCase() == 'dice roll') {
			return;
		}
		if (input.substring(0, 16).toLowerCase() == 'custom dice roll') {
			return;
		}

		send_message(input, character_name);
		input_history_add(input);
		return;
	}

	var parts = input.explode(' ', 2);
	var command = parts[0].substring(1);
	var param = (parts.length > 1) ? parts[1].trim() : '';

	switch (command) {
		case 'add':
			if (dungeon_master == false) {
				return;
			}

			if (param.trim() == '') {
				write_sidebar('Specify a name.');
				$('div.input input').val(input);
				return;
			} else {
				combat_add(param);
			}
			break;
		case 'audio':
			wf_audio_player.open();
			break;
		case 'cauldron':
			write_sidebar('<img src="/images/cauldron.png" draggable="false" />');
			break;
		case 'clear':
			$('div.sidebar').empty();
			break;
		case 'combat':
			if (dungeon_master == false) {
				return;
			}

			combat_start();
			break;
		case 'd20':
			if (roll_d20(param) == false) {
				$('div.input input').val(input);
				return;
			}
			break;
		case 'd20a':
			if (roll_d20(param, DICE_ROLL_ADVANTAGE) == false) {
				$('div.input input').val(input);
				return;
			}
			break;
		case 'd20d':
			if (roll_d20(param, DICE_ROLL_DISADVANTAGE) == false) {
				$('div.input input').val(input);
				return;
			}
			break;
		case 'damage':
			if (my_character == null) {
				return;
			}

			points = parseInt(param);
			if (isNaN(points)) {
				write_sidebar('Invalid damage points.');
				$('div.input input').val(input);
				return;
			}

			object_damage_command(my_character, points);
			break;
		case 'dicecolor':
			if ((param.length != 7) || (param.substr(0, 1) != '#')) {
				write_sidebar('Invalid color.');
				return;
			}
			if (typeof dicebox_color != 'function') {
				return;
			}
			dicebox_color(param);
			break;
		case 'dmroll':
			if (dungeon_master == false) {
				break;
			}

			if (roll_dice(param, false) == false) {
				write_sidebar('Invalid dice roll.');
				$('div.input input').val(input);
				return;
			}
			break;
		case 'done':
			if (dungeon_master == false) {
				return;
			}

			combat_stop();
			break;
		case 'expand':
			expand_sidebar();
			break;
		case 'fow':
			if ((fow_type != FOW_DAY_REAL) && (fow_type != FOW_NIGHT_REAL)) {
				write_sidebar('This command is only available for the \'real\' Fog of War mode.');
				return;
			}

			if (param == '') {
				var message = 'Fow of War options:\n' +
					'- <b>fast</b>: Use a faster render engine, which may show glitches.\n' +
					'- <b>normal</b>: Use the normal render engine.\n' +
					'- <b>mist</b>: Use mist as the Fog of War pattern.\n' +
					'- <b>&lt;url&gt;</b>: Use a remote image as the Fog of War pattern.';
				write_sidebar(message);
			} else if (param == 'fast') {
				document.location = document.location.pathname + '?fow=fast';
			} else if (param == 'normal') {
				document.location = document.location.pathname + '?fow=normal';
			} else {
				if (param == 'mist') {
					param = null;
				}

				if (my_character != null) {
					fog_of_war_pattern(param, my_character);
				} else if (fow_obj != null) {
					fog_of_war_pattern(param, fow_obj);
				}
			}
			break;
		case 'heal':
			if (my_character == null) {
				return;
			}

			points = parseInt(param);
			if (isNaN(points)) {
				write_sidebar('Invalid healing points');
				return;
			}

			object_damage_command(my_character, -points);
			break;
		case 'help':
			show_help();
			break;
		case 'history':
			if (param == 'clear') {
				input_history = [];
				input_index = -1;
				localStorage.removeItem('input_history');
				write_sidebar('History cleared.');
				return;
			}

			var history = 'Input history:\n';
			input_history.forEach(function(value) {
				history += '<span class="history" style="display:block">' + value + '</span>';
			});
			write_sidebar(history);
			$('div.sidebar span.history').off('click').on('click', function() {
				handle_input($(this).text());
			});
			break;
		case 'inventory':
			wf_collectables.open();
			break;
		case 'journal':
			wf_journal.open();
			break;
		case 'labels':
			if ((param == 'off') || (param == 'hide')) {
				$('div.character div.hitpoints, div.token div.hitpoints').css('display', 'none');
				$('div.character span, div.token span').css('display', 'none');

				$('div.character, div.token').hover(function() {
					$(this).find('div.hitpoints').css('display', 'block');
					$(this).find('span').css('display', 'block');
				}, function() {
					$(this).find('div.hitpoints').css('display', 'none');
					$(this).find('span').css('display', 'none');
				});
			} else if ((param == 'on') || (param == 'show')) {
				$('div.character div.hitpoints, div.token div.hitpoints').css('display', 'block');
				$('div.character span, div.token span').css('display', 'block');

				$('div.character, div.token').off('mouseenter mouseleave');
			}
			break;
		case 'log':
			if (param == '') {
				wf_journal.open();
			} else {
				journal_save_entry(character_name, param);
				write_sidebar('Journal entry added.');
			}
			return;
		case 'next':
			if (dungeon_master == false) {
				return;
			}

			combat_next(param);
			break;
		case 'night':
			if (dungeon_master == false) {
				return;
			}

			param = parseInt(param);
			if (isNaN(param)) {
				write_sidebar('Invalid level.');
				return;
			}

			if ((param < 0) || (param > 4)) {
				write_sidebar('Level out of range.');
				return;
			}

			var levels = {
				0: 0,
				1: 0.3,
				2: 0.5,
				3: 0.65,
				4: 0.8
			};

			night_level = levels[param];

			$('div.night').css('background-color', 'rgba(0, 0, 0, ' + night_level + ')');

			var data = {
				action: 'night',
				level: night_level
			};
			websocket_send(data);
			break;
		case 'noscript':
			if (dungeon_master == false) {
				return;
			}

			var data = {
				action: 'noscript'
			};
			websocket_send(data);

			script_disable_all();

			write_sidebar('All zone scripts have been disabled.');
			break;
		case 'notes':
			if ($('div.dm_notes').length > 0) {
				wf_dm_notes.open();
			}
			break;
		case 'pictures':
			wf_pictures.open();
			break;
		case 'ping':
			if (dungeon_master == false) {
				return;
			}

			write_sidebar('Present in this session:');

			var data = {
				action: 'ping'
			};
			websocket_send(data);
			break;
		case 'reload':
			if (dungeon_master == false) {
				return;
			}

			var data = {
				action: 'reload'
			};
			websocket_send(data);

			location.reload();
			break;
		case 'remove':
			if (dungeon_master == false) {
				return;
			}

			if (param == '') {
				write_sidebar('Specify a name.');
				$('div.input input').val(input);
				return;
			}

			combat_remove(param);
			break;
		case 'roll':
			if (param == '') {
				wf_dice_roll.open();
			} else if (roll_dice(param) == false) {
				write_sidebar('Invalid dice roll.');
				$('div.input input').val(input);
				return;
			}
			break;
		case 'spells':
			show_spells();
			break;
		case 'version':
			var version = $('div.playarea').attr('version');
			write_sidebar('Cauldron v' + version + '.');
			break;
		case 'walls':
			if (dungeon_master == false) {
				return;
			}

			if ((param == 'off') || (param == 'hide')) {
				$('div.wall').css('display', 'none');
				$('div.blinder').css('display', 'none');
			} else if ((param == 'on') || (param == 'show')) {
				$('div.wall').css('display', 'block');
				$('div.blinder').css('display', 'block');
			}
			break;
		case 'whisper':
			var parts = param.explode(' ', 2);
			if (parts.length != 2) {
				write_sidebar('Specify name and message.');
				return;
			}

			var name = parts[0].toLowerCase();
			var text = parts[1].trim();

			if (name != 'dm') {
				var char_id = undefined;
				$('div.character').each(function() {
					if ($(this).attr('player').substr(0, name.length).toLowerCase() == name) {
						if (char_id != undefined) {
							write_sidebar(name + ' is ambiguous.');
							return;
						}

						char_id = $(this).prop('id');
					}

					if ($(this).find('span.name').text().substr(0, name.length).toLowerCase() == name) {
						if ((char_id != undefined) && (char_id != $(this).prop('id'))) {
							write_sidebar(name + ' is ambiguous.');
							return;
						}

						char_id = $(this).prop('id');
					}
				});
			} else {
				char_id = 0;
			}

			if (char_id == undefined) {
				write_sidebar('Unknown character or player.');
				return;
			}

			var data = {
				action: 'say',
				to_char_id: char_id,
				name: character_name,
				mesg: text
			};
			websocket_send(data);

			var receiver = (char_id == 0) ? 'the Dungeon Master' : $('div#' + char_id).attr('player');
			write_sidebar('Message sent to ' + receiver + '.');
			break;
		default:
			write_sidebar('Unknown command.');
			$('div.input input').val(input);
			return;
	}

	input_history_add(input);
}

function context_menu_handler(key) {
	var obj = $(this);
	if (obj.prop('tagName').toLowerCase() == 'img') {
		obj = obj.parent();
	}

	var parts = key.split('_');
	var travel_map_id = 0;
	if (parts[0] == 'alternate') {
		key = parts[0];
		var alternate_id = parts[1];
	} else if (parts[0] == 'condition') {
		key = parts[0];
		var condition_id = parts[1];
	} else if (parts[0] == 'rotate') {
		key = parts[0];
		var direction = parts[1];
	} else if (parts[0] == 'shape') {
		key = parts[0];
		var shape_change_id = parts[1];
	} else if (parts[0] == 'travel') {
		key = parts[0];
		var travel_map_id = parts[1];
	}

	switch (key) {
		case 'alternate':
			if (alternate_id == 0) {
				var filename = my_character.find('img').attr('orig_src');
				var size = 1;
			} else {
				var alternate = $('div.alternates div[icon_id=' + alternate_id + ']');
				var filename = 'characters/' + alternate.attr('filename');
				var size = alternate.attr('size');
			}

			var img_size = size * grid_cell_size;

			my_character.find('img').attr('src', '/resources/' + resources_key + '/' + filename);
			my_character.css('width', img_size + 'px');
			my_character.find('img').css('height', img_size + 'px');

			var data = {
				action: 'alternate',
				char_id: my_character.attr('id'),
				size: size,
				src: filename
			};
			websocket_send(data);

			$.post('/object/alternate', {
				adventure_id: adventure_id,
				char_id: my_character.attr('char_id'),
				alternate_id: alternate_id
			});

			if (my_character != null) {
				fog_of_war_update(my_character);
			}
			break;
		case 'armor':
			var armor_class = obj.attr('armor_class');
			cauldron_prompt('Armor class:', armor_class, function(points) {
				points = parseInt(points);
				if (isNaN(points)) {
					write_sidebar('Invalid armor class.');
					return;
				}

				var data = {
					action: 'armor',
					instance_id: obj.prop('id'),
					points: points
				};
				websocket_send(data);

				$.post('/object/armor_class', {
					instance_id: obj.prop('id'),
					armor_class: points
				});

				obj.attr('armor_class', points);
			});
			break;
		case 'attack':
			wf_attack.find('select').val('Normal');
			wf_attack.open(obj);
			break;
		case 'condition':
			if (condition_id > 0) {
				var condition = $('div.conditions div[con_id=' + condition_id + ']').text();
				set_condition(obj, condition);
			} else {
				set_condition(obj, null);
			}
			break;
		case 'coordinates':
			var pos_x = Math.round(coord_to_grid(mouse_x, false) / grid_cell_size);
			var pos_y = Math.round(coord_to_grid(mouse_y, false) / grid_cell_size);
			write_sidebar('Coordinates: ' + pos_x + ',' + pos_y);
			break;
		case 'damage':
			var max_hp = obj.attr('hitpoints');
			var hp_left = (parseInt(max_hp) - parseInt(obj.attr('damage'))).toString();

			cauldron_prompt('Points (max HP=' + max_hp + ', HP left=' + hp_left + '):', '', function(points) {
				points = parseInt(points);
				if (isNaN(points)) {
					write_sidebar('Invalid damage points.');
					return;
				}

				if (obj.hasClass('selected')) {
					$('div.selected').each(function() {
						object_damage_command($(this), points);
					});
				} else {
					object_damage_command(obj, points);
				}
			});
			break;
		case 'delete':
			cauldron_confirm('Delete object(s)?', function() {
				if (obj.hasClass('selected')) {
					$('div.token.selected').each(function() {
						object_delete($(this));
					});
				} else {
					object_delete(obj);
				}
			});
			break;
		case 'distance':
			measuring_stop();

			var ruler_x = coord_to_grid(mouse_x, false);
			var ruler_y = coord_to_grid(mouse_y, false);
			ruler_previous = 0;

			var ruler_position = function(to_x, to_y) {
				var angle = points_angle(ruler_x, ruler_y, to_x, to_y);
				var distance = points_distance(ruler_x, ruler_y, to_x, to_y);

				var ruler = $('div.ruler.current');
				ruler.css('width', distance + 'px');
				ruler.css('height', '4px');
				ruler.css('transform', 'rotate(' + angle + 'deg)');
				ruler.css('z-index', LAYER_MARKER);

				measure_diff_x = Math.round(Math.abs(to_x - ruler_x) / grid_cell_size);
				measure_diff_y = Math.round(Math.abs(to_y - ruler_y) / grid_cell_size);

				ruler_distance = (measure_diff_x > measure_diff_y) ? measure_diff_x : measure_diff_y;
				ruler_distance += ruler_previous;

				var text = ruler_distance + ' / ' + (ruler_distance * 5) + 'ft';
				if (ruler_previous == 0) {
					text += ' / ' + (measure_diff_x + 1) + 'x' + (measure_diff_y + 1);
				}
				$('p.measure').text(text);
			}

			var sidebar = $('div.sidebar');
			sidebar.append('<p class="measure">&nbsp;</p>');
			sidebar.prop('scrollTop', sidebar.prop('scrollHeight'));

			$('div.playarea div.markers').append('<div class="ruler current" />');
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

			$('div.playarea').on('click', function(event) {
				if (ctrl_down == false) {
					measuring_stop();
					return;
				}

				ruler_previous = ruler_distance;

				var scr = screen_scroll();
				ruler_x = event.clientX + scr.left - 16;
				ruler_x = coord_to_grid(ruler_x, false);
				ruler_y = event.clientY + scr.top - 41;
				ruler_y = coord_to_grid(ruler_y, false);

				$('div.ruler.current').removeClass('current');
				$('div.playarea div.markers').append('<div class="ruler current" />');
				var ruler = $('div.ruler.current');
				ruler.css('left', (ruler_x + (grid_cell_size >> 1)) + 'px');
				ruler.css('top', (ruler_y + (grid_cell_size >> 1)) + 'px');
				ruler_position(ruler_x, ruler_y);
			});
			break;
		case 'door_close':
			door_make_closed(obj);
			break;
		case 'door_open':
			door_make_open(obj);
			break;
		case 'effect_create':
			effect_x = coord_to_grid(mouse_x, false);
			effect_y = coord_to_grid(mouse_y, false);
			wf_effect_create.open();
			break;
		case 'effect_duplicate':
			var pos = object_position($(this));
			effect_x = pos.left + $(this).width();
			effect_y = pos.top;

			var src = $(this).find('img').prop('src');
			var width = Math.round(parseInt($(this).width()) / grid_cell_size);
			var height = Math.round(parseInt($(this).height()) / grid_cell_size);

			var effect_id = effect_counter + '_' + map_id;
			effect_create_object(effect_id, src, effect_x, effect_y, width, height);
			effect_create_final(effect_id, src, width, height);
			effect_counter++;
			break;
		case 'effect_delete':
			var data = {
				action: 'effect_delete',
				instance_id: obj.prop('id')
			};
			websocket_send(data);

			obj.remove();
			break;
		case 'fill_texture':
			var src = obj.css('background-image');
			src = src.substring(5, src.length - 2);

			var image = new Image();
			image.src = src;
			var pattern = drawing_ctx.createPattern(image, 'repeat');
			drawing_ctx.fillStyle = pattern;
			drawing_ctx.fillRect(0, 0, drawing_canvas.width, drawing_canvas.height);

			var data = {
				action: 'fill_texture',
				src: src
			};
			websocket_send(data);

			drawing_history.push(data);
			break;
		case 'focus':
			object_focus(obj);
			break;
		case 'fow_show':
			object_show_fow(obj);
			break;
		case 'fow_distance':
			var distance = obj.attr('vision');
			var info = 'The actual vision distance for a character is the highest value of this map\'s Default nightly Fog of War distance (' + fow_map_distance + ') and the character\'s vision distance. A light source carried by a character can of course increase that distance.<br />Enter 0 or leave empty for infinite. To use the map\'s value, enter 1.';
			cauldron_info_prompt(info, 'Character vision distance:', distance, function(distance) {
				if (distance == '') {
					distance = 0;
				} else {
					distance = parseInt(distance);
					if (isNaN(distance)) {
						write_sidebar('Invalid distance.');
						return;
					} else if ((distance < 0) || (distance > 250)) {
						write_sidebar('Distance out of range (0-250).');
						return;
					}
				}

				$.post('/object/vision', {
					instance_id: obj.prop('id'),
					vision: distance
				}).done(function() {
					obj.attr('vision', distance);

					var data = {
						action: 'fow_distance',
						instance_id: obj.prop('id'),
						distance: distance
					};
					websocket_send(data);

					distance = character_vision(obj);

					if (obj.is(fow_obj)) {
						fog_of_war_set_distance(distance);
						fog_of_war_update(fow_obj);
					}

				});
			});
			break;
		case 'handover':
			var hand_over = function(character) {
				var objects = [];

				if (obj.hasClass('selected')) {
					$('div.token.selected').each(function() {
						objects.push($(this));
					});

					write_sidebar(character.attr('player') + ' can now control the selected tokens.');
				} else {
					objects.push(obj);

					message_to_sidebar(character.attr('player') + ' can now control ' + object_target_link(obj) + '.');
				}

				objects.forEach(function(object) {
					var data = {
						action: 'handover',
						instance_id: object.prop('id'),
						owner_id: character.prop('id')
					};
					websocket_send(data);
				});
			};

			var select_player = function() {
				var list = '<ul class="characters list-group">';
				$('div.characters div.character').each(function() {
					list += '<li char_id="' + $(this).prop('id') + '" class="list-group-item">' + $(this).find('span.name').text() + '</li>';
				});
				list += '</ul>';
				
				var wf_list = $(list).windowframe({
					header: 'Select a character',
					close: function() {
						wf_list.destroy();
					}
				});

				wf_list.find('li').on('click', function() {
					var char_id = $(this).attr('char_id');
					wf_list.close();

					hand_over($('div#' + char_id));
				}).css('cursor', 'pointer');

				wf_list.open();
			};

			if (focus_obj == null) {
				select_player();
			} else if (focus_obj.hasClass('character') == false) {
				select_player();
			} else {
				hand_over(focus_obj);
			}
			break;
		case 'heal':
			var max_hp = obj.attr('hitpoints');
			var damage = obj.attr('damage');

			cauldron_prompt('Points (max HP=' + max_hp + ', damage=' + damage + '):', '', function(points) {
				points = parseInt(points);
				if (isNaN(points)) {
					write_sidebar('Invalid healing points.');
					return;
				}

				if (obj.hasClass('selected')) {
					$('div.selected').each(function() {
						object_damage_command($(this), -points);
					});
				} else {
					object_damage_command(obj, -points);
				}
			});
			break;
		case 'info':
			object_info(obj);
			break;
		case 'known':
			$.post('/object/known', {
				instance_id: obj.prop('id'),
				known: 'yes'
			}).done(function() {
				obj.find('span.name').attr('known', 'yes');

				var data = {
					action: 'known',
					instance_id: obj.prop('id'),
					known: 'yes'
				};
				websocket_send(data);
			});
			break;
		case 'light_create':
			var pos_x = coord_to_grid(mouse_x, false);
			var pos_y = coord_to_grid(mouse_y, false);

			wf_light_create = $('<div><label for="light_new">Light radius:</label><input id="light_new" type="text" value="3" class="form-control" /></div>').windowframe({
				width: 530,
				style: 'danger',
				header: 'Create light',
				buttons: {
					'Create': function() {
						var radius = parseInt($('input#light_new').val());

						if (isNaN(radius)) {
							write_sidebar('Invalid radius.');
							return;
						} else if (radius < 1) {
							write_sidebar('Invalid radius (lower than 1).');
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
		case 'light_delete':
			cauldron_confirm('Delete light?', function() {
				$.post('/object/delete', {
					instance_id: obj.prop('id'),
				}).done(function() {
					var data = {
						action: 'light_delete',
						instance_id: obj.prop('id')
					};
					websocket_send(data);

					light_delete(obj);
				});
			});
			break;
		case 'light_radius':
			var radius = obj.attr('light');
			var info = 'Carrying a light source also affects what other players can see around this character. Enter 0 or leave empty for off.';
			cauldron_info_prompt(info, 'Character light source radius:', radius, function(radius) {
				if (radius == '') {
					radius = 0;
				} else {
					if (isNaN(radius)) {
						write_sidebar('Invalid radius.');
						return;
					} else if (radius < 0) {
						write_sidebar('Invalid radius.');
						return;
					} else if (radius > 250) {
						write_sidebar('Invalid radius (too large).');
						return;
					}
				}

				$.post('/object/light', {
					instance_id: obj.prop('id'),
					radius: radius
				}).done(function() {
					var data = {
						action: 'light_radius',
						instance_id: obj.prop('id'),
						radius: radius
					};
					websocket_send(data);

					light_radius(obj, radius);
				});
			});
			break;
		case 'light_toggle':
			light_toggle(obj);
			break;
		case 'lower':
			obj.parent().prepend(obj);

			var data = {
				action: 'lower',
				instance_id: obj.prop('id')
			};
			websocket_send(data);
			break;
		case 'marker':
			marker_create(mouse_x - 25, mouse_y - 50);

			var data = {
				action: 'marker',
				name: character_name,
				pos_x: mouse_x - 25,
				pos_y: mouse_y - 69
			};
			websocket_send(data);
			break;
		case 'maxhp':
			if (my_character == null) {
				return;
			}

			var max_hp = my_character.attr('hitpoints');
			cauldron_prompt('Maximum hit points:', max_hp, function(points) {
				points = parseInt(points);
				if (isNaN(points)) {
					write_sidebar('Invalid hit points.');
					return;
				}

				var data = {
					action: 'maxhp',
					instance_id: my_character.prop('id'),
					points: points
				};
				websocket_send(data);

				$.post('/object/hitpoints', {
					instance_id: my_character.prop('id'),
					hitpoints: points
				});

				my_character.attr('hitpoints', points);
				object_damage_command(my_character, points - max_hp);
			});
			break;
		case 'presence':
			object_toggle_presence(obj);
			break;
		case 'rotate':
			var compass = { 'n':   0, 'ne':  45, 'e':  90, 'se': 135,
			                's': 180, 'sw': 225, 'w': 270, 'nw': 315 };
			if ((direction = compass[direction]) != undefined) {
				object_rotate_command(obj, direction);
			}
			break;
		case 'sea_cone':
			spell_effect_area_cone(mouse_x, mouse_y);
			break;
		case 'sea_cone_angle':
			spell_effect_area_change_cone_angle();
			break;
		case 'sea_circle':
			spell_effect_area_circle(mouse_x, mouse_y);
			break;
		case 'sea_square':
			spell_effect_area_square(mouse_x, mouse_y);
			break;
		case 'shape':
			if (shape_change_id == 0) {
				var filename = obj.find('img').attr('orig_src');
				var size = 1;
			} else {
				var shape = $('div.shape_change div[shape_id=' + shape_change_id + ']');
				var filename = 'tokens/' + shape_change_id.toString() + '.' + shape.attr('extension');
				var size = $('div.shape_change div[shape_id=' + shape_change_id + ']').attr('size');
				var token_type = $('div.shape_change div[shape_id=' + shape_change_id + ']').attr('token_type');

				if (token_type == 'portrait') {
					object_rotate_command(obj, 0, 0);
				}
			}

			obj.find('img').attr('src', '/resources/' + resources_key + '/' + filename);
			obj.css('width', (grid_cell_size * size) + 'px');
			obj.find('img').css('height', (grid_cell_size * size) + 'px');

			var data = {
				action: 'shape',
				char_id: obj.attr('id'),
				src: filename,
				size: size
			};
			websocket_send(data);

			$.post('/object/shape', {
				adventure_id: adventure_id,
				char_id: obj.attr('char_id'),
				token_id: shape_change_id
			});
			break;
		case 'sheet':
			var char_id = obj.attr('char_id');
			var sheet_url = $('div.characters div.character[char_id="' + char_id + '"]').attr('sheet');
			window.open(sheet_url, '_blank');
			break;
		case 'takeback':
			var objects = [];

			if (obj.hasClass('selected')) {
				$('div.token.selected').each(function() {
					objects.push($(this));
				});

				write_sidebar('Players can no longer control the selected tokens.');
			} else {
				objects.push(obj);

				message_to_sidebar('Players can no longer control ' + object_target_link(obj) + '.');
			}

			objects.forEach(function(object) {
				var data = {
					action: 'takeback',
					instance_id: object.prop('id')
				};
				websocket_send(data);
			});
			break;
		case 'temphp':
			cauldron_prompt('Temporary hit points:', temporary_hitpoints().toString(), function(points) {
				points = parseInt(points);
				if (isNaN(points)) {
					write_sidebar('Invalid hit points.');
					return;
				}

				temporary_hitpoints(points);
			});
			break;
		case 'travel':
			var data = {
				action: 'travel',
				instance_id: obj.prop('id'),
				char_id: obj.attr('char_id'),
				hitpoints: obj.attr('hitpoints'),
				travel_map_id: travel_map_id
			};
			websocket_send(data);

			window.open('/adventure/' + adventure_id + '/' + travel_map_id);

			object_hide_command(obj);
			break;
		case 'unknown':
			$.post('/object/known', {
				instance_id: obj.prop('id'),
				known: 'no'
			}).done(function() {
				obj.find('span.name').attr('known', 'no');

				var data = {
					action: 'known',
					instance_id: obj.prop('id'),
					known: 'no'
				};
				websocket_send(data);
			});
			break;
		case 'view':
			object_view(obj);
			break;
		case 'window_open':
			window_make_open(obj);
			break;
		case 'window_close':
			window_make_closed(obj);
			break;
		case 'zone_create':
			zone_x = coord_to_grid(mouse_x, false);
			zone_y = coord_to_grid(mouse_y, false);

			$('div.zone_create input#width').val(3);
			$('div.zone_create input#height').val(3);
			wf_zone_create.open();
			$('div.zone_create div.panel-body').prop('scrollTop', 0);
			break;
		case 'zone_delete':
			cauldron_confirm('Delete zone?', function() {
				var group = obj.attr('group');
				if (group != undefined) {
					if (confirm('Delete all zones in group ' + group + '?')) {
						$('div.zone[group="' + group + '"]').each(function() {
							zone_delete($(this));
						});
					} else {
						zone_delete(obj);
					}
				} else {
					zone_delete(obj);
				}
			});
			break;
		default:
			write_sidebar('Unknown menu option: ' + key);
	}
}

function key_down(event) {
	if ((dungeon_master == false) && pause) {
		return;
	}

	if ($('div.input input:focus').length > 0) {
		return;
	}

	if ($('div.filter input:focus').length > 0) {
		return;
	}

	var open_windows = $('div.windowframe_overlay > div:visible');

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
		case 19:
			// Pauze / break
			if (dungeon_master) {
				$('div.menu button.pause').trigger('click');
			}
			break;
		case 27:
			// Escape
			$('p.measure').remove();
			measuring_stop();
			open_windows.close();
			context_menu_remove();
			$('div.menu').hide();
			spell_effect_area_stop();
			break;
		case 192:
			// ~
			if ($('div.diceroll:visible').length > 0) {
				wf_dice_roll.close();
			} else if (open_windows.length == 0) {
				wf_dice_roll.open();
			}
			break;
	}

	if (open_windows.length > 0) {
		return;
	}

	switch (event.which) {
		case 9:
			// TAB
			toggle_fullscreen();
			break;
		case 70:
			// f
			if (dungeon_master && (focus_obj != null) && focus_obj.hasClass('character')) {
				object_show_fow(focus_obj);
			}
			break;
		case 80:
			// p
			if (dungeon_master && focus_obj != null) {
				object_toggle_presence(focus_obj);
			}
			break;
	}
}

function key_up(event) {
	switch (event.which) {
		case 16:
			// Shift
			shift_down = false;
			$('canvas#drawing').off('mousemove');
			break;
		case 17:
			// CTRL
			ctrl_down = false;
			if (shift_down == false) {
				$('canvas#drawing').off('mousemove');
			}
			break;
		case 18:
			// ALT
			alt_down = false;
			break;
	}
}

/* Main
 */
$(document).ready(function() {
	group_key = $('div.playarea').attr('group_key');
	adventure_id = parseInt($('div.playarea').attr('adventure_id'));
	map_id = parseInt($('div.playarea').attr('map_id'));
	map_width = $('div.playarea > div').width();
	map_height = $('div.playarea > div').height();
	user_id = parseInt($('div.playarea').attr('user_id'));
	resources_key = $('div.playarea').attr('resources_key');
	grid_cell_size = parseInt($('div.playarea').attr('grid_cell_size'));
	my_name = $('div.sidebar').attr('name');
	character_name = $('div.playarea').attr('name');
	dungeon_master = ($('div.playarea').attr('is_dm') == 'yes');
	fow_type = parseInt($('div.playarea').attr('fog_of_war'));
	fow_map_distance = parseInt($('div.playarea').attr('fow_distance'));
	player_notes = $('div.playarea div.notes').text();
	var version = $('div.playarea').attr('version');
	var ws_host = $('div.playarea').attr('ws_host');
	var ws_port = $('div.playarea').attr('ws_port');
	
	if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)) {
		mobile_device = true;
	}

	write_sidebar('<img src="/images/cauldron.png" style="max-width:80px; display:block; margin:0 auto" draggable="false" />');
	write_sidebar('<b>Welcome to Cauldron v' + version + '</b>');
	write_sidebar('Type /help for command information.');
	write_sidebar('You are ' + character_name + '.');

	if (dungeon_master) {
		/* Pauze button
		 */
		$('div.menu button.pause').on('click', function() {
			pause = (pause == false);

			if (pause) {
				$(this).addClass('btn-primary');
				$(this).removeClass('btn-default');
				write_sidebar('The game is paused.');
			} else {
				$(this).addClass('btn-default');
				$(this).removeClass('btn-primary');
				write_sidebar('The game is continued.');
			}

			var data = {
				action: 'pause',
				pause: pause
			};
			websocket_send(data);

			localStorage.setItem('pause', pause);
		});
	}

	/* Websocket
	 */
	websocket = new WebSocket('wss://' + ws_host + ':' + ws_port + '/websocket');

	websocket.onopen = function(event) {
		var data = {
			group_key: group_key
		};
		websocket_send(data);

		if (dungeon_master) {
			if (localStorage.getItem('pause') == 'true') {
				$('div.menu button.pause').trigger('click');
			}

			var color = $('div.draw-tools div.draw-colors span:nth-child(' + DRAW_DEFAULT_COLOR + ')').css('background-color');
			var data = {
				action: 'draw_color',
				color: color
			};
			websocket_send(data);

			var data = {
				action: 'draw_width',
				width: DRAW_DEFAULT_WIDTH
			};
			websocket_send(data);

			var data = {
				action: 'draw_clear'
			};
			websocket_send(data);
		}

		$('div.draw-tools div.draw-colors span:nth-child(' + DRAW_DEFAULT_COLOR + ')').trigger('click');

		write_sidebar('Connection established.');
		var role = (dungeon_master) ? 'being the' : 'playing';
		send_message(my_name + ' entered the session, ' + role + ' ' + character_name + '.', null, false);

		var parts = window.location.pathname.split('/');
		if (parts.length == 4) {
			var my_char_id = $('div.playarea').attr('my_char');
			if (my_char_id != undefined) {
				object_damage_command($('div#' + my_char_id), 0);
			}
		}

		if (my_character != null) {
			/* Unhide character
			 */
			if (my_character.attr('is_hidden') == 'yes') {
				object_show_command(my_character);
				scroll_to_my_character();
			}

			/* Request map status from DM
			 */
			var data = {
				action: 'request_init',
				user_id: user_id,
				char_id: my_character.prop('id')
			};
			websocket_send(data);
		}

		if ((fow_type == FOW_DAY_REAL) || (fow_type == FOW_NIGHT_REAL)) {
			if (FOW_REAL_FAST) {
				return;
			}
		}
	}

	websocket.onmessage = function(event) {
		try {
			data = JSON.parse(event.data);
		} catch (e) {
			return;
		}

		if (data.adventure_id != adventure_id) {
			return;
		} else if (data.map_id != map_id) {
			return;
		} else if (data.from_user_id == user_id) {
			return;
		}

		if (typeof data.to_char_id !== 'undefined') {
			if (dungeon_master && (data.to_char_id != 0)) {
				return;
			} else if (my_character != null) {
				if (data.to_char_id != my_character.prop('id')) {
					return;
				}
			}
		}

		if (typeof data.to_user_id !== 'undefined') {
			if (data.to_user_id != user_id) {
				return;
			}
		}

		delete data.adventure_id;
		delete data.from_user_id;

		switch (data.action) {
			case 'alternate':
				var img_size = data.size * grid_cell_size;
				$('div#' + data.char_id).find('img').attr('src', '/resources/' + resources_key + '/' + data.src);
				$('div#' + data.char_id).css('width', img_size + 'px');
				$('div#' + data.char_id).find('img').css('height', img_size + 'px');
				break;
			case 'armor':
				var obj = $('div#' + data.instance_id);
				obj.attr('armor_class', data.points);
				if (dungeon_master) {
					write_sidebar(obj.find('span.name').text() + '\'s armor class set to ' + data.points + '.');
				}
				break;
			case 'audio':
				var audio = new Audio(data.filename);
				audio.play();
				break;
			case 'condition':
				var obj = $('div#' + data.object_id);
				set_conditions(obj, data.condition);
				save_conditions(obj, data.condition);
				break;
			case 'create':
				var obj = '<div id="token' + data.instance_id + '" token_id="' + data.token_id +'" class="token" style="left:' + data.pos_x + 'px; top:' + data.pos_y + 'px; z-index:' + LAYER_TOKEN + '" type="' + data.type + '" is_hidden="no" rotation="0" armor_class="' + data.armor_class + '" hitpoints="' + data.hitpoints + '" damage="0" name="">' +
						  '<img src="' + data.url + '" style="width:' + data.width + 'px; height:' + data.height + 'px;" draggable="false" />' +
						  '</div>';
				$('div.playarea div.tokens').append(obj);
				$('div#token' + data.instance_id).on('contextmenu', object_contextmenu_player);
				break;
			case 'damage':
				var obj = $('div#' + data.instance_id);
				object_damage_action(obj, data.damage, data.perc);
				break;
			case 'delete':
				var obj = $('div#' + data.instance_id);
				obj.remove();
				break;
			case 'done':
				combat_stop();
				break;
			case 'door_state':
				var obj = $('div#' + data.door_id);
				switch (data.state) {
					case 'closed': door_show_closed(obj); break;
					case 'open': door_show_open(obj); break;
				}
				break;
			case 'draw_brush':
				drawing_ctx.beginPath();
				var pattern = drawing_ctx.createPattern(brushes[data.brush], 'repeat');
				drawing_ctx.strokeStyle = pattern;
				break
			case 'draw_clear':
				drawing_ctx.clearRect(0, 0, drawing_canvas.width, drawing_canvas.height);

				if (fow_type == FOW_REVEAL) {
					fog_of_war_reset();
				}
				break
			case 'draw_color':
				drawing_ctx.beginPath();
				drawing_ctx.strokeStyle = data.color;
				break
			case 'draw_move':
				drawing_ctx.globalCompositeOperation = (data.erase == 'yes') ? 'destination-out' : 'source-over';
				drawing_ctx.lineWidth = data.width;
				drawing_ctx.beginPath();
				drawing_ctx.moveTo(data.draw_x, data.draw_y);
				break
			case 'draw_line':
				drawing_ctx.lineCap = data.linecap;
				drawing_ctx.lineTo(data.draw_x, data.draw_y);
				drawing_ctx.stroke();
				break
			case 'draw_width':
				drawing_ctx.beginPath();
				drawing_ctx.lineWidth = data.width;
				break;
			case 'effect_create':
				if (data.map_id != map_id) {
					break;
				}
				if ($('div#' + data.instance_id).length == 0) {
					effect_create_object(data.instance_id, data.src, data.pos_x, data.pos_y, data.width, data.height);
				}
				break;
			case 'effect_delete':
				$('div#' + data.instance_id).remove();
				break;
			case 'fill_texture':
				var image = new Image();
				image.src = data.src;
				$(image).on('load', function() {
					var pattern = drawing_ctx.createPattern(image, 'repeat');
					drawing_ctx.fillStyle = pattern;
					drawing_ctx.fillRect(0, 0, drawing_canvas.width, drawing_canvas.height);
				});
				break;
			case 'found':
				collectable_found_action(data.collectable_id);
				collectables_reopen_inventory();
				break;
			case 'fow_distance':
				var distance = parseInt(data.distance);
				if (isNaN(distance)) {
					break;
				}

				var obj = $('div#' + data.instance_id);
				obj.attr('vision', data.distance);

				if (my_character == null) {
					break;
				} else if (my_character.prop('id') != data.instance_id) {
					break;
				}

				distance = character_vision(obj);

				fog_of_war_set_distance(distance);
				fog_of_war_update(my_character);
				break;
			case 'handover':
				if (data.owner_id != my_character.prop('id')) {
					return;
				}

				if (data.instance_id.substring(0, 4) == 'zone') {
					var handle = null;
				} else {
					var handle = 'img';
				}

				var obj = $('div#' + data.instance_id);

				obj.draggable({
					containment: 'div.playarea > div',
					handle: handle,
					stop: function(event, ui) {
						object_move($(this));
					}
				});

				if (obj.hasClass('token') || obj.hasClass('character')) {
					obj.draggable({
						start: object_drag_start,
						drag: object_drag_drag,
						stop: object_drag_stop
					});
				}

				obj.css('cursor', 'grab');

				message_to_sidebar('You can now control ' + object_target_link(obj) + '.');

				if (data.instance_id.substring(0, 4) == 'zone') {
					return;
				} else if (data.instance_id.substring(0, 6) == 'effect') {
					return;
				}

				obj.find('img').off('contextmenu');
				obj.find('img').on('contextmenu', function(event) {
					$('div.selected').removeClass('selected');

					var menu_entries = {
						'info': { name:'Get infomation', icon:'fa-info-circle' },
						'view': { name:'View', icon:'fa-search' },
						'sep1': '-',
						'rotate': { name:'Rotate', icon:'fa-compass', items:{
							'rotate_n':  { name:'North', icon:'fa-arrow-circle-up' },
							'rotate_ne': { name:'North East' },
							'rotate_e':  { name:'East', icon:'fa-arrow-circle-right' },
							'rotate_se': { name:'South East' },
							'rotate_s':  { name:'South', icon:'fa-arrow-circle-down' },
							'rotate_sw': { name:'South West' },
							'rotate_w':  { name:'West', icon:'fa-arrow-circle-left' },
							'rotate_nw': { name:'North West' }
						}},
						'lower': { name:'Lower', icon:'fa-arrow-down' },
						'sep2': '-',
						'sea': sea_submenu,
						'attack': { name:'Attack', icon:'fa-legal' },
						'sep3': '-',
						'marker': { name:'Set marker', icon:'fa-map-marker' },
						'distance': { name:'Measure distance', icon:'fa-map-signs' }
					};

					if (obj.attr('token_type') == 'portrait') {
						delete menu_entries['rotate'];
					}

					context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);

					return false;
				});

				break;
			case 'hide':
				var obj = $('div#' + data.instance_id);
				object_hide_action(obj);
				break;
			case 'journal_add':
				journal_add_entry(data.name, data.content, data.entry_id);
				write_sidebar(data.name + ' added a journal entry.');
				break;
			case 'journal_update':
				var entry = $('div.journal div.entry[entry_id=' + data.entry_id + ']');
				if (data.content == '') {
					entry.remove();
				} else {
					entry.find('span.content').text(data.content);
				}
				break;
			case 'known':
				var obj = $('div#' + data.instance_id);
				obj.find('span.name').attr('known', data.known);
				obj.find('span.name').css('display', (data.known == 'yes') ? 'block' : 'none');
				break;
			case 'light_create':
				light_create_object(data.instance_id, data.pos_x, data.pos_y, data.radius);
				break;
			case 'light_delete':
				var obj = $('div#' + data.instance_id);
				light_delete(obj);
				break;
			case 'light_radius':
				var obj = $('div#' + data.instance_id);
				light_radius(obj, data.radius);
				break;
			case 'light_state':
				var light = $('div#light' + data.light_id);
				light_state(light, data.state);
				break;
			case 'lower':
				var obj = $('div#' + data.instance_id);
				obj.parent().prepend(obj);
				break;
			case 'map_image':
				var image = $('<img src="' + data.url + '" />');
				image.one('load', function() {
					$('div#map_background').css('background-image', 'url(' + data.url + ')');
					delete image;
				});
				break;
			case 'marker':
				marker_create(data.pos_x, data.pos_y, data.name);
				break;
			case 'maxhp':
				var obj = $('div#' + data.instance_id);
				obj.attr('hitpoints', data.points);
				if (dungeon_master) {
					write_sidebar(obj.find('span.name').text() + '\'s maximum hit points set to ' + data.points + '.');
				}
				break;
			case 'move':
				var obj = $('div#' + data.instance_id);

				obj.stop(false, true);
				obj.animate({
					left: data.pos_x,
					top: data.pos_y
				}, data.speed, function() {
					if (obj.is(my_character)) {
						var pos = {
							left: data.pos_x,
							top: data.pos_y
						}

						zone_init_presence();
					} else if (obj.hasClass('zone') && (my_character != null)) {
						var pos = object_position(my_character);
						if (zone_covers_position(obj, pos)) {
							if (zone_presence.includes(data.instance_id) == false) {
								zone_presence.push(data.instance_id);
							}
						} else {
							if (zone_presence.includes(data.instance_id)) {
								zone_presence = zone_presence.remove(data.instance_id);
							}
						}
					}

					if (keep_centered && obj.is(my_character)) {
						scroll_to_my_character(0);
					}

					/* Fog of War
					 */
					if (obj.is(fow_obj) || obj.is(my_character)) {
						fog_of_war_update(obj);
					} else if (obj.hasClass('character') && (my_character != null)) {
						if (parseInt(obj.attr('light')) > 0) {
							fog_of_war_update(my_character);
						}
					}
				});
				break;
			case 'night':
				$('div.night').css('background-color', 'rgba(0, 0, 0, ' + data.level + ')');
				break;
			case 'noscript':
				script_disable_all();
				break;
			case 'pause':
				pause = data.pause;

				if (data.pause) {
					$('div.pause').show();
					$('div.input input').trigger('blur');
				} else {
					$('div.pause').hide();
				}
				break;
			case 'ping':
				var data = {
					action: 'pong',
					user_id: 0,
					name: my_name + ' (' + character_name + ')'
				};
				websocket_send(data);
				break;
			case 'player_notes':
				player_notes = data.notes;
				var notes = $('div.collectables textarea.notes');
				if (notes.length > 0) {
					notes.val(player_notes);
				}
				break;
			case 'pong':
				if (dungeon_master) {
					write_sidebar('&ndash; ' + data.name);
				}
				break;
			case 'reload':
				document.location = '/adventure/' + adventure_id;
				break;
			case 'request_init':
				if (dungeon_master == false) {
					break;
				} else if (data.map_id != map_id) {
					break;
				}

				var to_user_id = data.user_id;
				var char_id = data.char_id;

				if (pause) {
					var data = {
						action: 'pause',
						pause: true
					};
					websocket_send(data);
				}

				drawing_history.forEach(function(draw) {
					draw.to_user_id = to_user_id;
					websocket_send(draw);
				});

				$('div.effect').each(function() {
					var pos = object_position($(this));

					var data = {
						action: 'effect_create',
						to_user_id: to_user_id,
						instance_id: $(this).prop('id'),
						src: $(this).find('img').prop('src'),
						pos_x: pos.left,
						pos_y: pos.top,
						width: Math.round($(this).width() / grid_cell_size),
						height: Math.round($(this).height() / grid_cell_size)
					};
					websocket_send(data);
				});

				var data = {
					action: 'night',
					to_user_id: to_user_id,
					level: night_level
				};
				websocket_send(data);

				$('div.window[transparent=no]').each(function() {
					window_send_state($(this));
				});
				break;
			case 'rotate':
				var obj = $('div#' + data.instance_id);
				object_rotate_action(obj, data.rotation, data.speed);
				break;
			case 'say':
				message_to_sidebar(data.mesg, data.name);
				break;
			case 'sea_circle':
				spell_effect_area_draw_circle(data.center_x, data.center_y, data.radius);
				break;
			case 'sea_cone':
				spell_effect_area_draw_cone(data.origin_x, data.origin_y, data.radius, data.angle, data.cone_angle);
				break;
			case 'sea_square':
				spell_effect_area_draw_square(data.pos_x, data.pos_y, data.range);
				break;
			case 'sea_clear':
				spell_effect_area_clear();
				break;
			case 'scan':
				var data = {
					action: 'reveal',
					name: character_name
				};
				websocket_send(data);
				break;
			case 'shape':
				var size = parseInt(data.size)
				$('div#' + data.char_id).find('img').attr('src', '/resources/' + resources_key + '/' + data.src);
				$('div#' + data.char_id).css('width', (grid_cell_size * size) + 'px');
				$('div#' + data.char_id).find('img').css('height', (grid_cell_size * size) + 'px');
				break;
			case 'show':
				var obj = $('div#' + data.instance_id);
				object_show_action(obj);
				break;
			case 'takeback':
				var obj = $('div#' + data.instance_id);

				if (obj.css('cursor') != 'grab') {
					return;
				}

				obj.css('cursor', 'default');
				obj.find('img').css('cursor', 'default');
				obj.draggable('destroy');
				obj.removeClass('selected');

				obj.find('img').off('contextmenu');
				obj.find('img').on('contextmenu', object_contextmenu_player);

				message_to_sidebar('You can no longer control ' + object_target_link(obj) + '.');
				break;
			case 'travel':
				if (data.instance_id == my_character.prop('id')) {
					document.location = '/adventure/' + adventure_id + '/' + data.travel_map_id;
				}
				break;
			case 'turn':
				if (my_character == null) {
					break;
				}

				if (my_character.attr('char_id') == data.char_id) {
					zone_check_presence_for_turn(my_character);
				}
				break;
			case 'unfound':
				collectable_unfound_action(data.collectable_id);
				collectables_reopen_inventory();
				break;
			case 'window_state':
				var obj = $('div#' + data.window_id);
				switch (data.transparent) {
					case 'no': window_show_closed(obj); break;
					case 'yes': window_show_open(obj); break;
				}
				break;
			case 'zone_create':
				zone_create_object(data.instance_id, data.pos_x, data.pos_y, data.width, data.height,
				                   data.color, data.opacity, data.group, data.altitude);
				break;
			case 'zone_delete':
				var zone = $('div#' + data.instance_id);
				var altitude = parseInt(zone.attr('altitude'));
				zone.remove();

				if (altitude > 0) {
					if (my_character != null) {
						fog_of_war_update(my_character);
					} else if (fow_obj != null) {
						fog_of_war_update(fow_obj);
					}
				}
				break;
			case 'zone_group':
				if (data.zone_group != '') {
					$('div#' + data.zone_id).attr('group', data.zone_group);
				} else {
					$('div#' + data.zone_id).removeAttr('group');
				}
				break;
			default:
				write_sidebar('Unknown action: ' + data.action);
		}
	};

	websocket.onerror = function(event) {
		write_sidebar('Connection error. Does your firewall allow outgoing traffic via port ' + ws_port + '?');
		websocket = null;
	};

	websocket.onclose = function(event) {
		write_sidebar('Connection closed.');
		window.setTimeout(function() {
			cauldron_alert('The connection to the server was lost. Refresh the page to reconnect.');
		}, 1000);
		websocket = null;
	};

	/* Menu
	 */
	$('button.open_menu').on('click', function(event) {
		var skip = 1;
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

	var map = $('div.playarea > div');
	var width = Math.round(map.width());
	var height = Math.round(map.height());

	/* Layers
	 */
	$('div.night').css('z-index', LAYER_NIGHT);
	$('div.drawing').css('z-index', LAYER_DRAWING);
	$('div.grid').css('z-index', LAYER_GRID);
	$('div.zones').css('z-index', LAYER_ZONE);
	$('div.walls').css('z-index', LAYER_CONSTRUCT);
	$('div.doors').css('z-index', LAYER_CONSTRUCT);
	$('div.blinders').css('z-index', LAYER_CONSTRUCT);
	$('div.lights').css('z-index', LAYER_LIGHT);
	$('div.tokens').css('z-index', LAYER_TOKEN);
	$('div.effects').css('z-index', LAYER_EFFECT);
	$('div.characters').css('z-index', LAYER_CHARACTER);
	$('div.markers').css('z-index', LAYER_MARKER);
	$('div.fog_of_war').css('z-index', LAYER_FOG_OF_WAR);

	/* Night mode
	 */
	$('div.night').css({
		width:width,
		height:height
	});

	/* Show grid
	 */
	if ($('div.playarea').attr('show_grid') == 'yes') {
		grid_init(grid_cell_size);
		$('div.grid canvas').css('z-index', LAYER_GRID);
	}

	/* Spell effect area
	 */
	spell_effect_area_init(grid_cell_size);

	sea_submenu = { name:'Spell effect area', icon:'fa-magic', items:{
		'sea_circle': { name:'Circle', icon:'fa-circle' },
		'sea_cone': { name:'Cone', icon:'fa-play' },
		'sea_square': { name:'Square', icon:'fa-stop' },
		'sep': '-',
		'sea_cone_angle': { name:'Change cone angle', icon:'fa-edit' }
	}};

	/* Map offset
	 */
	var map_offset_x = parseInt($('div.playarea').attr('offset_x'));
	var map_offset_y = parseInt($('div.playarea').attr('offset_y'));

	if ((map_offset_x > 0) || (map_offset_y > 0)) {
		var map = $('div.playarea div:first video');
		if (map.length == 0) {
			map = $('div.playarea div#map_background');
			map.css('background-position', '-' + map_offset_x + 'px -' + map_offset_y + 'px');
		} else {
			map.css('margin-left', '-' + map_offset_x + 'px');
			map.css('margin-top', '-' + map_offset_y + 'px');
		}
	}

	/* Drawing
	 */
	drawing_canvas = $('canvas#drawing');
	drawing_canvas.css('z-index', LAYER_DRAWING);
	drawing_canvas = drawing_canvas[0];

	drawing_ctx = drawing_canvas.getContext('2d');
	drawing_ctx.lineWidth = DRAW_DEFAULT_WIDTH;
	drawing_ctx.strokeStyle = DRAW_DEFAULT_COLOR;

	drawing_ctx.lineJoin = 'bevel';

	if (dungeon_master) {	
		var handle = $('div#draw_width div');
		$('div#draw_width').slider({
			value: DRAW_DEFAULT_WIDTH,
			min: 1,
			max: grid_cell_size,
			create: function() {
				handle.text($(this).slider("value"));
			},
			slide: function(event, ui) {
				handle.text(ui.value);
			},
			stop: function(event, ui) {
				drawing_ctx.lineWidth = ui.value;

				var data = {
					action: 'draw_width',
					width: ui.value
				};
				websocket_send(data);
				drawing_history.push(data);
			}
		});

		$('canvas#drawing').on('mousedown', function(event) {
			if (event.button != 0) {
				return true;
			}

			if ($('div.ruler').length > 0) {	
				$(this).remove();
				return true;
			}

			var pos = $('div.playarea').position();
			var canvas_x = Math.round(pos.left) + 1;
			var canvas_y = Math.round(pos.top) + 1;

			if (shift_down) {
				drawing_ctx.globalCompositeOperation = 'destination-out';
				if (ctrl_down == false) {
					drawing_ctx.lineWidth = DRAW_ERASE_THIN;
				} else if (alt_down) {
					drawing_ctx.lineWidth = grid_cell_size;
				} else {
					drawing_ctx.lineWidth = DRAW_ERASE_THICK;
				}
			} else if (ctrl_down) {
				drawing_ctx.globalCompositeOperation = drawing_mode;
				drawing_ctx.lineWidth = parseInt($('div#draw_width div').text());
			} else {
				return;
			}

			var scr = screen_scroll();
			var draw_x = event.clientX - canvas_x + scr.left;
			var draw_y = event.clientY - canvas_y + scr.top;

			var half_grid = grid_cell_size >> 1;
			var draw_wide = drawing_ctx.lineWidth > half_grid;
			if (alt_down) {
				draw_x = coord_to_grid(draw_x, draw_wide == false);
				draw_y = coord_to_grid(draw_y, draw_wide == false);

				if (draw_wide) {
					draw_x += half_grid;
					draw_y += half_grid;
				}
			}

			var data = {
				action: 'draw_move',
				erase: shift_down ? 'yes' : 'no',
				width: drawing_ctx.lineWidth,
				draw_x: draw_x,
				draw_y: draw_y
			};
			websocket_send(data);
			drawing_history.push(data);

			drawing_ctx.beginPath();
			drawing_ctx.moveTo(draw_x, draw_y);

			var draw_prev_x = null;
			var draw_prev_y = null;

			var draw = function(event) {
				var scr = screen_scroll();

				var draw_x = event.clientX - canvas_x + scr.left;
				var draw_y = event.clientY - canvas_y + scr.top;

				if (alt_down) {
					draw_x = coord_to_grid(draw_x, draw_wide == false);
					draw_y = coord_to_grid(draw_y, draw_wide == false);

					if (draw_wide) {
						draw_x += half_grid;
						draw_y += half_grid;
					}
				}

				if ((draw_x == draw_prev_x) && (draw_y == draw_prev_y)) {
					return;
				}

				draw_prev_x = draw_x;
				draw_prev_y = draw_y;

				if ((drawing_ctx.lineWidth == grid_cell_size) && alt_down) {
					drawing_ctx.lineCap = 'square';
				} else {
					drawing_ctx.lineCap = 'round';
				}

				var data = {
					action: 'draw_line',
					draw_x: draw_x,
					draw_y: draw_y,
					linecap: drawing_ctx.lineCap
				};
				websocket_send(data);
				drawing_history.push(data);

				drawing_ctx.lineTo(draw_x, draw_y);
				drawing_ctx.stroke();
			}

			draw(event);
			$('canvas#drawing').on('mousemove', function(event) {
				draw(event);
			});

			$('canvas#drawing').on('mouseleave', function(event) {
				drawing_ctx.closePath();
			});

			$('canvas#drawing').on('mouseenter', function(event) {
				var scr = screen_scroll();
				var draw_x = event.clientX - canvas_x + scr.left;
				var draw_y = event.clientY - canvas_y + scr.top;

				drawing_ctx.beginPath();
				drawing_ctx.moveTo(draw_x, draw_y);
			});

			$('canvas#drawing').one('mouseup', function() {
				$('canvas#drawing').off('mousemove');
			});
		});

		$('div.draw-tools div.draw-colors span').on('click', function() {
			var color = $(this).css('background-color');

			drawing_ctx.strokeStyle = color;
			drawing_mode = 'source-over';

			var data = {
				action: 'draw_color',
				color: color
			};
			websocket_send(data);
			drawing_history.push(data);

			$('div.draw-tools div.draw-colors span').css('box-shadow', '');
			$('div.draw-tools div.draw-brushes span').css('box-shadow', '');
			$(this).css('box-shadow', '0 0 5px 2px #0080ff');
		});

		$('div.draw-tools div.draw-brushes span').on('click', function() {
			if ($(this).attr('title') == 'Fog of War') {
				drawing_ctx.strokeStyle = FOW_COLOR_DM;
				drawing_mode = 'xor';
			} else {
				var img = new Image();
				img.src = $(this).attr('brush');
				img.onload = function() {
					var pattern = drawing_ctx.createPattern(img, 'repeat');
					drawing_ctx.strokeStyle = pattern;
				};
				drawing_mode = 'source-over';
			}

			var data = {
				action: 'draw_brush',
				brush: $(this).attr('brush')
			};
			websocket_send(data);
			drawing_history.push(data);

			$('div.draw-tools div.draw-colors span').css('box-shadow', '');
			$('div.draw-tools div.draw-brushes span').css('box-shadow', '');
			$(this).css('box-shadow', '0 0 5px 2px #0080ff');
		});

		$('div.draw-tools div.draw-brushes span').on('contextmenu', function(event) {
			menu_entries = {
				'fill_texture': { name:'Fill map with texture', icon:'fa-square' }
			};

			var menu_settings = {
				root: 'body',
				z_index: LAYER_MENU
			};

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_settings);
			return false;
			
		});

		$('button.draw_clear').on('click', function() {
			var image = $('div#map_background').css('background-image');
			image = image.substring(image.length - 15, image.length - 2);

			var clear_dialog = '<div class="clear"><p>Remove drawings?</p>';
			if (image == 'empty_map.png') {
				clear_dialog +=
					'<div><input type="checkbox" checked="checked" class="remove_effects"> Remove effects.</div>' +
					'<div><input type="checkbox" checked="checked" class="remove_tokens"> Remove tokens.</div>' +
					'<div><input type="checkbox" checked="checked" class="remove_zones"> Remove zones.</div>';
			}
			clear_dialog += '</div>';

			var wf_clear_window = $(clear_dialog).windowframe({
				header: 'Remove map items',
				buttons: {
					'Remove': function() {
						/* Drawings
						 */
						var data = {
							action: 'draw_clear'
						};
						websocket_send(data);

						drawing_history = [];

						var data = {
							action: 'draw_color',
							color: drawing_ctx.strokeStyle
						};
						drawing_history.push(data);

						var data = {
							action: 'draw_width',
							width: drawing_ctx.lineWidth
						};
						drawing_history.push(data);

						drawing_ctx.clearRect(0, 0, drawing_canvas.width, drawing_canvas.height);

						if (fow_type == FOW_REVEAL) {
							fog_of_war_reset();
						}

						/* Effects
						 */
						if (wf_clear_window.find('input.remove_effects').prop('checked')) {
							$('div.effect').each(function() {
								var data = {
									action: 'effect_delete',
									instance_id: $(this).prop('id')
								};
								websocket_send(data);

								$(this).remove();
							});
						}

						/* Tokens
						 */
						if (wf_clear_window.find('input.remove_tokens').prop('checked')) {
							$('div.token').each(function() {
								object_delete($(this));
							});
						}

						/* Zones
						 */
						if (wf_clear_window.find('input.remove_zones').prop('checked')) {
							$('div.zone').each(function() {
								zone_delete($(this));
							});
						}
						
						$(this).close();
					},
					'Cancel': function() {
						$(this).close();
					},
				},
				close: function() {
					wf_clear_window.destroy();
				}
			});

			wf_clear_window.open();
		});
	}

	/* Doors
	 */
	$('div.door').each(function() {
		door_position($(this));
	});

	$('div.door').css('z-index', LAYER_CONSTRUCT);

	if (dungeon_master) {
		$('div.door').on('contextmenu', function(event) {
			var menu_entries = {};

			if ($(this).attr('state') == 'open') {
				menu_entries['door_close'] = { name:'Close', icon:'fa-toggle-off' };
			} else {
				menu_entries['door_open'] = { name:'Open', icon:'fa-toggle-on' };
			}

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		$('div.door').on('dblclick', function(event) {
			if ($(this).attr('state') == 'open') {
				door_make_closed($(this));
			} else {
				door_make_open($(this));
			}
		});
	}

	/* Walls
	 */
	$('div.wall[transparent="yes"]').addClass('window');

	$('div.wall').each(function() {
		wall_position($(this));
	});

	$('div.wall').css('z-index', LAYER_CONSTRUCT);

	$('div.wall[transparent=yes]').on('contextmenu', function(event) {
		var menu_entries = {};

		if ($(this).attr('transparent') == 'yes') {
			menu_entries['window_close'] = { name:'Close', icon:'fa-toggle-off' };
		} else {
			menu_entries['window_open'] = { name:'Open', icon:'fa-toggle-on' };
		}

		context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
		return false;
	});

	/* Lights
	 */
	if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
		$('div.light').css('z-index', LAYER_LIGHT);
	}

	/* Blinders
	 */
	$('div.blinder').each(function() {
		blinder_position($(this));
	});

	$('div.blinder').css('z-index', LAYER_CONSTRUCT);

	/* Zones
	 */
	$('div.zone').css('z-index', LAYER_ZONE);

	/* Objects
	 */
	if ($('video').length > 0) {
		$('video').on('loadeddata', function() {
			$('div.token[is_hidden=no]').each(function() {
				$(this).show();
			});
		});
		$('video').on('play', function() {
			$('button.playvideo').remove();
		});
		$('video').append('<source src="' + $('video').attr('source') + '"></source>');
	} else {
		$('div.token[is_hidden=no]').each(function() {
			$(this).show();
		});
	}

	$('div.character[is_hidden=yes]').each(function() {
		object_hide_action($(this));
	});

	$('div.token').each(function() {
		$(this).css('z-index', LAYER_TOKEN);
		object_rotate_action($(this), $(this).attr('rotation'), 0);

		if ($(this).attr('hitpoints') > 0) {
			if ($(this).attr('damage') == $(this).attr('hitpoints')) {
				object_dead($(this));
			}
		}
	});

	$('div.character').each(function() {
		$(this).css('z-index', LAYER_CHARACTER);
		object_rotate_action($(this), $(this).attr('rotation'), 0);

		if ($(this).attr('hitpoints') > 0) {
			if ($(this).attr('damage') == $(this).attr('hitpoints')) {
				object_dead($(this));
			}
		}
	});

	if (dungeon_master) {
		/* Dungeon Master settings
		 */
		$('div.zone').draggable({
			containment: 'div.playarea > div',
			stop: function(event, ui) {
				object_move($(this));
			}
		});
		$('div.zone').filter(function() {
			return $(this).css('background-color') == 'rgb(0, 0, 0)';
		}).hover(function() {
			$(this).css('border', '1px solid #a0a000');
		}, function() {
			$(this).css('border', '');
		});

		if ($('div.character').length == 0) {
			write_sidebar('<hr class="top" />');
			write_sidebar('There are no player characters in your adenture. Invite players via the invitation code as set in the <a href="/vault/invite">Invite</a> section in the Dungeon Master\'s Vault. After that, add their characters via the <a href="/vault/players">Players</a> section.');
			write_sidebar('<hr class="bottom" />');
		};

		$('div.character, div.token').each(function() {
			var hitpoints = parseInt($(this).attr('hitpoints')) - parseInt($(this).attr('damage'));
			$(this).attr('title', 'HP: ' + hitpoints);
		});

		/* Drag multiple tokens and characters
		 */
		$('div.token, div.character').draggable({
			containment: 'div.playarea > div',
			handle: 'img',
			start: object_drag_start,
			drag: object_drag_drag,
			stop: object_drag_stop
		});

		if (mobile_device == false) {
			$('div.characters div.character img').on('click', object_click);
			$('div.characters div.character img').on('dblclick', object_dblclick);
			$('div.tokens div.token img').on('click', object_click);
			$('div.tokens div.token img').on('dblclick', object_dblclick);
		}

		$('div.playarea').on('click', function() {
			if (focus_obj != null) {
				focus_obj.find('img').css('border', '');
				focus_obj = null;
			}
		});

		$('div.token[is_hidden=yes]').each(function() {
			$(this).fadeTo(0, OBJECT_HIDDEN_FADE);
		});
		
		$('div.light').each(function() {
			var state = $(this).attr('state');
			var radius = $(this).attr('radius');
			$(this).append('<img src="/images/light_' + state + '.png" title="Radius: ' + radius + '" style="width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px;" />');
		});

		$('div.light').draggable({
			containment: 'div.playarea > div',
			handler: 'img',
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		$('div.light').on('dblclick', function(event) {
			light_toggle($(this));
			event.stopPropagation();
		});

		$('div.light').on('contextmenu', function(event) {
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

		/* Menu zones
		 */
		zone_menu = {
			'info': { name:'Get information', icon:'fa-info-circle' },
			'sep1': '-',
			'marker': { name:'Set marker', icon:'fa-map-marker' },
			'distance': { name:'Measure distance', icon:'fa-map-signs' },
			'coordinates': { name:'Show coordinates', icon:'fa-flag' },
			'effect_create': { name:'Create effect', icon:'fa-fire' },
			'light_create': { name:'Create light', icon:'fa-lightbulb-o' },
			'sep2': '-',
			'sea': sea_submenu,
			'sep3': '-',
			'handover': { name:'Hand over', icon:'fa-hand-stop-o' },
			'takeback': { name:'Take back', icon:'fa-hand-grab-o' },
			'sep4': '-',
			'zone_delete': { name:'Delete', icon:'fa-trash' },
		};

		if ((fow_type != FOW_NIGHT_CELL) && (fow_type != FOW_NIGHT_REAL)) {
			delete zone_menu['light_create'];
		}

		$('div.zone').on('contextmenu', function(event) {
			var menu_entries = zone_menu;

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		/* Menu tokens
		 */
		$('div.tokens div.token img').on('contextmenu', object_contextmenu_dm);

		/* Menu characters
		 */
		$('div.character img').on('contextmenu', function(event) {
			$('div.selected').removeClass('selected');

			var menu_entries = {
				'info': { name:'Get information', icon:'fa-info-circle' },
				'view': { name:'View', icon:'fa-search' }
			};

			var char_id = $(this).parent().attr('char_id');
			var sheet = $('div.characters div.character[char_id="' + char_id + '"]').attr('sheet');
			if (sheet != '') {
				menu_entries['sheet'] = { name:'View character sheet', icon:'fa-file-text-o' };
			}

			menu_entries['presence'] = { name:'Toggle presence', icon:'fa-low-vision' };

			menu_entries['sep1'] = '-';
			menu_entries['distance'] = { name:'Measure distance', icon:'fa-map-signs' };
			menu_entries['coordinates'] = { name:'Get coordinates', icon:'fa-flag' };
			menu_entries['focus'] = { name:'Focus', icon:'fa-binoculars' };
			menu_entries['sep2'] = '-';

			if ((fow_type != FOW_NONE) && (fow_type != FOW_REVEAL)) {
				if ($(this).parent().is(fow_obj)) {
					menu_entries['fow_show'] = { name:'Remove Fog of War', icon:'fa-mixcloud' };
				} else {
					menu_entries['fow_show'] = { name:'Show its Fog of War', icon:'fa-cloud' };
				}
				menu_entries['fow_distance'] = { name:'Set vision distance', icon:'fa-cloud-upload' };
				menu_entries['light_radius'] = { name:'Set light radius', icon:'fa-lightbulb-o' };
				menu_entries['sep3'] = '-';
			}

			menu_entries['sea'] = sea_submenu;
			menu_entries['attack'] = { name:'Attack', icon:'fa-legal' };
			menu_entries['damage'] = { name:'Damage', icon:'fa-warning' };
			menu_entries['heal'] = { name:'Heal', icon:'fa-medkit' };

			var has = $(this).parent().find('span.conditions').text().split(',');
			var conditions = {};
			conditions['condition_0'] = { name: 'None' };
			conditions['sep0'] = '-';
			$('div.conditions div').each(function() {
				var con_id = $(this).attr('con_id');
				var name = $(this).text();
				var icon = has.includes(name) ? 'fa-check-square-o' : 'fa-square-o';
				conditions['condition_' + con_id] = { name: name, icon: icon};
			});

			menu_entries['conditions'] = { name:'Set condition', icon:'fa-heartbeat', items:conditions};

			var shapes = {};
			shapes['shape_0'] = { name: 'Default' };
			shapes['sep0'] = '-';
			$('div.shape_change div').each(function() {
				var shape_id = $(this).attr('shape_id');
				shapes['shape_' + shape_id] = { name: $(this).text()};
			});

			if (Object.keys(shapes).length > 2) {
				menu_entries['shapes'] = { name:'Change shape', icon:'fa-user-circle', items:shapes};
			}

			menu_entries['sep4'] = '-';
			menu_entries['zone_create'] = { name:'Create zone', icon:'fa-square-o' };

			var maps = {};
			$('select.map-selector option').each(function() {
				var m_id = $(this).attr('value');
				if (m_id != map_id) {
					var key = 'travel_' + m_id;
					maps[key] = { name: $(this).text()};
				}
			});

			if (Object.keys(maps).length > 0) {
				menu_entries['send'] = { name:'Send to map', icon:'fa-compass', items:maps};
			}

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);

			return false;
		});

		/* Menu map
		 */
		$('div.playarea > div').on('contextmenu', function(event) {
			var menu_entries = {
				'marker': { name:'Set marker', icon:'fa-map-marker' },
				'distance': { name:'Measure distance', icon:'fa-map-signs' },
				'coordinates': { name:'Get coordinates', icon:'fa-flag' },
				'sep1': '-',
				'sea': sea_submenu,
				'sep2': '-',
				'effect_create': { name:'Create effect', icon:'fa-fire' },
				'light_create': { name:'Create light', icon:'fa-lightbulb-o' },
				'zone_create': { name:'Create zone', icon:'fa-square-o' }
			};

			if ((fow_type != FOW_NIGHT_CELL) && (fow_type != FOW_NIGHT_REAL)) {
				delete menu_entries['light_create'];
			}

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		$('div.characters').css('cursor', 'grab');
		$('div.effects').css('cursor', 'grab');
		$('div.lights').css('cursor', 'grab');
		$('div.tokens').css('cursor', 'grab');
		$('div.zones').css('cursor', 'grab');

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
				ui.helper.css('z-index', '1');
			},
			stop: function(event, ui) {
				var x = (event.pageX > 0) ? event.pageX : 0;
				var y = (event.pageY > 0) ? event.pageY : 0;
				object_create($(this), x, y);
			}
		});

		/* Start combat button
		 */
		$('button.start_combat').on('click', function() {
			combat_start();
		});

		if (fow_type == FOW_REVEAL) {
			fog_of_war_init(LAYER_FOG_OF_WAR, true);
		}

		/* Draw tools
		 */
		$('div.playarea').css('bottom', '90px');

		/* Library filter
		 */
		var library_filter = function() {
			var param = $('div.filter input').val().toLowerCase();

			$('div.library div.well').each(function() {
				var name = $(this).find('div.name').text().toLowerCase();
				if (name.includes(param) == false) {
					$(this).hide();
				} else {
					$(this).show();
				}
			});
		};
		$('div.filter input').on('keyup', library_filter);
		library_filter();

		/* Combat active?
		 */
		combat_check_running();
	} else {
		/* Player settings
		 */
		var my_char = $('div.playarea').attr('my_char');
		if (my_char != undefined) {
			my_character = $('div#' + my_char);

			character_id = my_character.attr('char_id');

			my_character.addClass('mine');

			if ($('div.playarea').attr('drag_character') == 'yes') {
				my_character.draggable({
					containment: 'div.playarea > div',
					handle: 'img',
					stop: function(event, ui) {
						object_move($(this));
					}
				});
				my_character.css('cursor', 'grab');
			}

			my_character.css('z-index', LAYER_CHARACTER_OWN);

			/* Menu my character
			 */
			$('div#' + my_char + ' img').on('contextmenu', function(event) {
				var menu_entries = {
					'info': { name:'Get information', icon:'fa-info-circle' },
					'view': { name:'View', icon:'fa-search' },
					'distance': { name:'Measure distance', icon:'fa-map-signs' },
					'sep1': '-',
					'sea': sea_submenu,
					'damage': { name:'Damage', icon:'fa-warning' },
					'heal': { name:'Heal', icon:'fa-medkit' },
					'temphp': { name:'Set temporary hit points', icon:'fa-heart-o' },
					'sep2': '-',
					'maxhp': { name:'Set maximum hit points', icon:'fa-heart' },
					'armor': { name:'Set armor class', icon:'fa-shield' },
					'sep3': '-'
				};

				var has = $(this).parent().find('span.conditions').text().split(',');
				var conditions = {};
				conditions['condition_0'] = { name: 'None' };
				conditions['sep0'] = '-';
				$('div.conditions div').each(function() {
					var con_id = $(this).attr('con_id');
					var name = $(this).text();
					var icon = has.includes(name) ? 'fa-check-square-o' : 'fa-square-o';
					conditions['condition_' + con_id] = { name: name, icon: icon};
				});

				menu_entries['conditions'] = { name:'Set condition', icon:'fa-heartbeat', items:conditions };

				var alternates = $('div.alternates div');
				if (alternates.length > 0) {
					var icons = {};
					icons['alternate_0'] = { name: 'Default' };
					icons['sep1'] = '-';

					alternates.each(function() {
						var icon_id = $(this).attr('icon_id');
						icons['alternate_' + icon_id] = { name: $(this).text()};
					});

					menu_entries['alternates'] = { name:'Change icon', icon:'fa-user-circle', items:icons };
				}

				context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
				return false;
			});

			/* Unknown tokens
			 */
			$('div.token span.name[known="no"]').css('display', 'none');

			/* Zone presence
			 */
			zone_init_presence();

			/* Fog of war
			 */
			if (fow_type == FOW_REVEAL) {
				fog_of_war_init(LAYER_FOG_OF_WAR, false);
			} else {
				fog_of_war_init(LAYER_FOG_OF_WAR);
				if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
					var distance = character_vision(my_character);
					fog_of_war_set_distance(distance);
				}
				fog_of_war_update(my_character);
			}

			/* Anti-cheat
			 */
			var layer_removed_triggered = false;

			var layer_removed = function(layer) {
				if (layer_removed_triggered) {
					return;
				}
				layer_removed_triggered = true;

				$('div#map_background').remove();
				send_message('Player ' + character_name + ' removed the ' + layer + ' layer.', 'Anti-Cheat');

			};

			$('div.walls').on('DOMNodeRemoved', function() {
				layer_removed('walls');
			});
			$('div.wall').on('DOMNodeRemoved', function() {
				layer_removed('walls');
			});

			$('div.doors').on('DOMNodeRemoved', function() {
				layer_removed('doors');
			});
			$('div.door').on('DOMNodeRemoved', function() {
				layer_removed('doors');
			});

			$('div.blinders').on('DOMNodeRemoved', function() {
				layer_removed('blinders');
			});
			$('div.blinder').on('DOMNodeRemoved', function() {
				layer_removed('blinders');
			});

			$('div.fog_of_war').on('DOMNodeRemoved', function() {
				layer_removed('fog of war');
			});
			$('div.fog_of_war canvas').on('DOMNodeRemoved', function() {
				layer_removed('fog of war');
			});

			$('div.pause').on('DOMNodeRemoved', function() {
				layer_removed('pause');
			});
		}

		/* Menu tokens
		 */
		$('div.tokens div.token').on('contextmenu', object_contextmenu_player);

		/* Menu (other) characters
		 */
		$('div.character:not(.mine) img').on('contextmenu', function(event) {
			var menu_entries = {
				'info': { name:'Get information', icon:'fa-info-circle' },
				'view': { name:'View', icon:'fa-search' },
				'sep1': '-',
				'sea': sea_submenu,
				'attack': { name:'Attack', icon:'fa-legal' },
				'sep2': '-',
				'marker': { name:'Set marker', icon:'fa-map-marker' },
				'distance': { name:'Measure distance', icon:'fa-map-signs' },
			};

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		/* Menu map
		 */
		$('div.playarea > div').on('contextmenu', function(event) {
			var menu_entries = {
				'marker': { name:'Set marker', icon:'fa-map-marker' },
				'distance': { name:'Measure distance', icon:'fa-map-signs' },
				'sea': sea_submenu
			};

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		/* Update character position
		 */
		window.setInterval(function() {
			if (char_pos_changed == false) {
				return;
			}

			$.post('/object/move', {
				instance_id: my_character.prop('id'),
				pos_x: char_pos_x,
				pos_y: char_pos_y
			});

			char_pos_changed = false;
		}, CHAR_POS_SAVE_DELAY * 1000);

		/* Pre-load brushes
		 */
		$('div.brushes img').each(function() {
			var src = $(this).attr('src');

			var image = new Image;
			image.src = src;
			brushes[src] = image;
		});
	}

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
		$('div.icon-selector').css('z-index', DEFAULT_Z_INDEX + 4);

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

	/* Sidebar expand
	 */
	expand_sidebar = function() {
		var content = $('div.sidebar').clone();
		content.removeClass('sidebar').addClass('sidebar_expanded');
		content.find('div.expand').remove();

		var wf_expanded = $(content).windowframe({
			header: 'Sidebar expanded',
			width: 1000,
			height: 600,
			open: function() {
				var container = wf_expanded.parent();
				container.scrollTop(container.prop("scrollHeight"));
			},
			close: function() {
				wf_expanded.destroy();
			}
		});

		wf_expanded.parent().css('background-image', 'url(/images/layout/background-bright.png)');

		wf_expanded.open();
	};

	$('div.sidebar').on('click', function() {
		if (ctrl_down) {
			expand_sidebar();
		}
	});

	/* Input field
	 */
	$('div.input input').on('keyup', function (e) {
		if ((e.key === 'Enter') || (e.keyCode === 13)) {
			var input = $(this).val();
			$(this).val('');
			handle_input(input);
		}

		if ((e.key === 'ArrowUp') || (e.keyCode === 38)) {
			if (input_index + 1 < input_history.length) {
				input_index++;
			}
			$(this).val(input_history[input_index]);
		}

		if ((e.key === 'ArrowDown') || (e.keyCode === 40)) {
			if (input_index >= 0) {
				input_index--;
				$(this).val(input_history[input_index]);
			} else {
				$(this).val('');
			}
		}
	});

	/* Windows
	 */
	if (dungeon_master) {
		var audio_content = '<div><ul class="audio"></ul></div';
		wf_audio_player = $(audio_content).windowframe({
			activator: 'button.play_audio',
			header: 'Audio files from Resources',
			info: 'This tool allows you to play audio files for everybody. It uses the files in the audio resources directory. The resources section can be found in the DM\'s Vault.',
			open: function() {
				var audio_list = wf_audio_player.find('ul');
				audio_list.empty();

				$.ajax('/adventure/audio').done(function(data) {
					var files = $(data).find('audio sound');
					if (files.length > 0) {
						files.each(function() {
							audio_list.append('<li>/' + $(this).text() + '</li>');
						});

						audio_list.find('li').on('click', function() {
							wf_audio_player.close();

							$('div.input input').focus();

							var filename = $(this).text();
							filename = filename.substr(0, 11) + resources_key + filename.substr(10);

							var data = {
								action: 'audio',
								filename: filename
							};
							websocket_send(data);

							var audio = new Audio(filename);
							audio.play();
						});
					} else {
						wf_audio_player.append('<p>You have no audio files. Upload them to the \'audio\' directory in the DM\'s Vault Resources section.</p>');
					}
				});
			}
		});

		wf_effect_create = $('div.effect_create').windowframe({
			width: 540,
			style: 'default',
			header: 'Create effect',
			footer: '<span class="effect_size">width: <input id="effect_width" type="number" value="1" min="1" /></span>' +
					'<span class="effect_size">height: <input id="effect_height" type="number" value="1" min="1" /></span>'
		});

		$('div.effect_create img').on('click', function() {
			effect_create($(this));
		});

		wf_dm_notes = $('div.dm_notes').windowframe({
			activator: 'button.show_dm_notes',
			style: 'danger',
			header: 'DM notes'
		});

		var pictures_loaded = false;
		wf_pictures = $('<div class="pictures"><div>Directory: <select class="form-control"></select></div><div class="row"></div></div>').windowframe({
			activator: 'button.pictures',
			style: 'primary',
			header: 'Pictures',
			info: 'This tool allows you to show pictures to everybody. It uses the files in the pictures resources directory. The resources section can be found in the DM\'s Vault.',
			width: 900,
			top: 100,
			open: function() {
				if (pictures_loaded == false) {
					wf_pictures.find('select').trigger('change');
				}
			}
		});

		$.ajax('/adventure/picture_directories').done(function(data) {
			var directories = wf_pictures.find('select');

			directories.append('<option value="">[root]</option>');
			$(data).find('directories directory').each(function() {
				directories.append('<option>' + $(this).text() + '</option>');
			});
		});

		wf_pictures.find('select').on('change', function() {
			var directory = wf_pictures.find('select').val();
			var pictures = wf_pictures.find('div.row');

			wf_pictures.find('p').remove();
			pictures.empty();

			$.post('/adventure/pictures', {
				directory: directory
			}).done(function(data) {
				if (directory != '') {
					directory += '/';
				}

				if ($(data).find('files file').length == 0) {
					wf_pictures.append('<p>No pictures found.</p>');
				} else $(data).find('files file').each(function() {
					var image = '<img src="/resources/' + resources_key + '/pictures/' + directory + $(this).text() + '" />';
					pictures.append('<div class="col-xs-4">' + image + '</div>');
				});

				wf_pictures.find('img').on('click', function() {
					var link = $(this).attr('src');
					link = 'https://' + location.hostname + link;
					send_message(link);

					wf_pictures.close();
				});

				pictures_loaded = true;
			});
		});

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
	}

	wf_collectables = $('<div class="collectables"></div>').windowframe({
		activator: 'button.show_collectables',
		style: 'success',
		header: 'Inventory',
		info: 'This window shows all the collectables that have been found by the players during the adventure.',
		width: 700,
		top: 150,
		open: collectables_show
	});

	wf_attack = $('div.attack').windowframe({
		width: 500,
		header: 'Attack',
		info: '<p>Use this tool to make a d20 attack roll against the selected creature. The result will be shown in the sidebar.</p><p>An advantage roll uses the highest score of two d20 dice rolls. A disadvantage roll uses the lowest score of two d20 dice rolls.</p><p>The attack roll is compared to the selected creature\'s armor class. The result is also shown in the sidebar.</p>',
		open: function() {
			var input = wf_attack.find('input');
			var length = input.val().length;
			input.focus();
			input[0].setSelectionRange(length, length);
		},
		buttons: {
			'Ok': function() {
				var bonus = parseInt(wf_attack.find('input').val());
				wf_attack.close();

				if (isNaN(bonus)) {
					write_sidebar('Invalid attack bonus.');
					return;
				}

				var obj = wf_attack.parent().parent().data('param');
				var armor_class = parseInt(obj.attr('armor_class'));
				var message = 'Target: ' + object_target_link(obj) + '\n';
				var type = wf_attack.find('select').val();

				dice = [ '1d20' ];
				if (type != 'Normal') {
					dice.push('1d20');
				}

				dice_roll(dice, bonus, function(result, extra) {
					var roll = result[0];

					if (type == 'Advantage') {
						if (result[1] > roll) {
							roll = result[1];
						}
					} else if (type == 'Disadvantage') {
						if (result[1] < roll) {
							roll = result[1];
						}
					}

					var details = '';
					if (type != 'Normal') {
						details += type + ': [' + result[0] + '] [' + result[1] + '] > [' + roll + ']\n';
					}
					details += 'Attack roll: [' + roll + ']';
					if (bonus > 0) {
						details += ' + ' + bonus + ' = ' + (roll + bonus);
					}
					details += '\n';

					if (dungeon_master == false) {
						message += details;
					}

					message += 'Result: ';

					if (roll == 20) {
						message += 'CRIT!';
					} else if (((roll + bonus) >= armor_class) && (roll > 1)) {
						message += 'hit!';
					} else {
						message += 'miss';
					}

					send_message(message, character_name);

					if (dungeon_master) {
						message = details;
						if (obj.attr('armor_class') != undefined) {
							message += 'Armor class: ' + obj.attr('armor_class');
						}
						write_sidebar(message);
					}
				});
			},
			'Cancel': function() {
				wf_attack.close();
			}
		}
	});

	wf_journal = $('div.journal').windowframe({
		activator: 'button.show_journal',
		style: 'info',
		header: 'Journal',
		info: 'Use the journal to keep track of the adventure\'s progress. Entries are shared among all players and the dungeon master. The filter can be used to search for journal entries.</p><p>Click one of your own entries while holding the CTRL key to edit it. Remove the entire text to delete the entry.',
		width: 1000,
		height: 500,
		open: journal_show,
		close: function() {
			if (wf_entry_edit != null) {
				wf_entry_edit.destroy();
				wf_entry_edit = null;
			}
		}
	});

	var my_entries = $('div.journal div.entry[user_id=' + user_id + ']');
	my_entries.css('cursor', 'text');
	my_entries.on('click', function() {
		journal_edit_entry($(this));
	});

	$('div.journal textarea').on('keyup', function(event) {
		event.stopPropagation();
	});

	$('button.journal_write').on('click', function() {
		journal_write();
	});

	$('button.center_character').on('click', function() {
		center_character($(this));
	});

	$('button.interface_color').on('click', function() {
		interface_color($(this));
	});

	$('button.fullscreen').on('click', function() {
		toggle_fullscreen();
	});

	$('select.map-selector').on('change', function() {
		map_switch();
	});

	$('button.map_image').on('click', function() {
		map_image();
	});

	$('button.playvideo').on('click', function() {
		$('video').get(0).play();
	});

	/* Other stuff
	 */
	$('div.playarea').on('mousedown', store_mouse_position);

	var conditions = localStorage.getItem('conditions');
	if (conditions != undefined) {
		conditions = JSON.parse(conditions);
		for (var [key, value] of Object.entries(conditions)) {
			set_conditions($('div#' + key), value);
		}
	}

	var audio_file = $('div.playarea').attr('audio');
	if (audio_file != undefined) {
		var audio = new Audio(audio_file);
		audio.loop = true;
		audio.play();
	}

	input_history = localStorage.getItem('input_history');
	if (input_history != undefined) {
		input_history = JSON.parse(input_history);
	} else {
		input_history = [];
	}

	scroll_to_my_character();

	$('body').on('keydown', key_down);
	$('body').on('keyup', key_up);
	$('body').on('keyup', object_steer);

	$(window).focus(function() {
		ctrl_down = false;
		shift_down = false;
		alt_down = false;
		$('canvas#drawing').off('mousemove');
	});

	/* Interface color
	 */
	var color = localStorage.getItem('interface_color');
	if (color == 'dark') {
		interface_color($('button#itfcol'), false);
	}

	/* Touchscreens
	 */
	if (mobile_device) {
		$('div.characters div.character img').on('click', object_click_mobile);
		$('div.tokens div.token img').on('click', object_click_mobile);
	}

	/* Cauldron20 browser extension
	 */
	window.setTimeout(function() {
		$('div.topbar div.btn-group button:nth-of-type(2)').on('click', function() {
			window.setTimeout(function() {
				$('div#customOverlay').draggable({
					containment: 'div.playarea > div'
				});
			}, 500);
		});
	}, 1000);
});

$(window).on('load', function() {
	$('div.loading').remove();
});
