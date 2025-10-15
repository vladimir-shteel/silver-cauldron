const ROLL_NORMAL = 0;
const ROLL_ADVANTAGE = 1;
const ROLL_DISADVANTAGE = 2;

const DEFAULT_Z_INDEX = 10000;
const LAYER_TOKEN = DEFAULT_Z_INDEX;
const LAYER_CHARACTER = DEFAULT_Z_INDEX + 1;
const LAYER_CHARACTER_OWN = DEFAULT_Z_INDEX + 2;
const LAYER_FOG_OF_WAR = DEFAULT_Z_INDEX + 3;
const LAYER_MARKER = DEFAULT_Z_INDEX + 4;
const LAYER_MENU = DEFAULT_Z_INDEX + 5;
const LAYER_VIEW = DEFAULT_Z_INDEX + 2000;

const DOOR_SECRET = '#a0a000';
const DOOR_OPEN = '#40c040';
const DOOR_OPACITY = '0.6';

const DRAW_DEFAULT_COLOR = 1;
const DRAW_DEFAULT_WIDTH = 5;

var websocket;
var group_key = null;
var adventure_id = null;
var map_id = null;
var user_id = null;
var resources_key = null;
var grid_cell_size = null;
var z_index = DEFAULT_Z_INDEX;
var focus_obj = null;
var drawing_canvas = null;
var drawing_ctx = null;
var fullscreen = false
var fullscreen_backup = undefined;
var reveal_message = false;

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

function change_map() {
	document.location = '/spectate/' + adventure_id + '/' + $('select.map-selector').val();
}

function screen_scroll() {
	var scr = {};

	scr.left = Math.round($('div.playarea').scrollLeft());
	scr.top = Math.round($('div.playarea').scrollTop());

	return scr;
}

function write_sidebar(message) {
    var sidebar = $('div.sidebar');
    message = message.replace(/\n/g, '<br />');
    sidebar.append('<p>' + message + '</p>');
    sidebar.prop('scrollTop', sidebar.prop('scrollHeight'));
}

function show_image(img) {
	var image = '<div class="image_overlay" onClick="javascript:$(this).remove()"><img src="' + $(img).attr('src') + '" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); border:1px solid #000000; max-width:80%; max-height:80%; cursor:pointer" /></div>';

	$('body').append(image);
	$('body div.image_overlay').show();
}

function message_to_sidebar(message, name = null) {
	if ((message.substring(0, 7) == 'http://') || (message.substring(0, 8) == 'https://')) {
		var parts = message.split('.');
		var extension = parts.pop();
		var images = ['gif', 'jpg', 'jpeg', 'png'];

		if (images.includes(extension)) {
			message = '<img src="' + message + '" style="width:160px; cursor:pointer;" onClick="javascript:show_image(this)" />';
		} else {
			message = '<a href="' + message + '" target="_blank">' + message + '</a>';
		}
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

					var mouse_over = 'onMouseOver="javascript:$(\'div#' + params + '\').addClass(\'target\');"';
					var mouse_out = 'onMouseOut="javascript:$(\'div#' + params + '\').removeClass(\'target\');"';
					replacement = '<span ' + mouse_over + '' + mouse_out + ' class="target">' + content + '</span>';
					break;
				case 'spell':
					break;
				default:
					pos = end + 1;
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

function coord_to_grid(coord, edge = true) {
	var delta = coord % grid_cell_size;
	coord -= delta;

	if (edge && (delta > (grid_cell_size >> 1))) {
		coord += grid_cell_size;
	}

	return coord;
}

/* Interface functions
 */
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

/* Draw functions
 */
function draw_circle(draw_x, draw_y) {
	var width = drawing_ctx.lineWidth;
	drawing_ctx.lineWidth = 1;
	drawing_ctx.beginPath();
	drawing_ctx.arc(draw_x, draw_y, (width / 2) - 1, 0, 2 * Math.PI);
	drawing_ctx.stroke();
	drawing_ctx.fillStyle = drawing_ctx.strokeStyle;
	drawing_ctx.fill();
	drawing_ctx.lineWidth = width;
}

/* Object functions
 */
function object_alive(obj) {
	obj.removeClass('dead');
}


function object_contextmenu(event) {
	var menu_entries = {
		'view': {name:'View', icon:'fa-search'}
	};

	context_menu_show($(this), event, menu_entries, context_menu_handler, LAYER_MENU);
	return false;
}

function object_dead(obj) {
	obj.addClass('dead');
}

function object_hide(obj) {
	obj.hide(100);
	obj.attr('is_hidden', 'yes');
}

function object_info(obj) {
	var info = '';

	if (obj.hasClass('zone') == false) {
		var name = obj.find('span.name');
		if (name.length > 0) {
			info += 'Name: ' + name.text() + '<br />';
		}

		if (obj.attr('id').substring(0, 5) == 'token') {
			info += 'Type: ' + obj.attr('type') + '<br />';
		}
		info += 'Armor class: ' + obj.attr('armor_class') + '<br />';

		info += 'Max hit points: ' + obj.attr('hitpoints') + '<br />';

		var remaining = parseInt(obj.attr('hitpoints')) - parseInt(obj.attr('damage'));
		info +=
			'Damage: ' + obj.attr('damage') + '<br />' +
			'Hit points: ' + remaining.toString() + '<br />';

		if (obj.hasClass('character')) {
			info += 'Initiative bonus: ' + obj.attr('initiative') + '<br />';
		}
	}

	write_sidebar(info);
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

function object_rotate(obj, rotation, speed = 500) {
	var img = obj.find('img');
	var width = img.width() / grid_cell_size;
	var height = img.height() / grid_cell_size;

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

function object_show(obj) {
	obj.show(100);
	obj.attr('is_hidden', 'no');
}

function object_view(obj, max_size = 500) {
	var color = localStorage.getItem('interface_color');
	var bgcolor = (color == 'dark') ? '64, 64, 64' : '160, 160, 160';

	var src = obj.find('img').prop('src');
	var onclick = 'javascript:$(this).remove();';
	var div_style = 'position:absolute; z-index:' + LAYER_VIEW + '; top:0; left:0; right:0; bottom:0; background-color:rgba(' + bgcolor + ', 0.8);';
	var span_style = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%)';
	var img_style = 'display:block; max-width:' + max_size + 'px; max-height:' + max_size + 'px;';
	var name = obj.find('span.name').text();

	var transform = obj.find('img').css('transform');
	if (transform != 'none') {
		img_style += ' transform:' + transform + ';';
	}

	if ((obj.hasClass('token') == false) && (obj.hasClass('character') == false)) {
		img_style += ' border:1px solid #000000; background-color:#ffffff;';
	}

	var view = '<div id="view" style="' + div_style + '" onClick="' + onclick +'"><span style="' + span_style + '"><img src="' + src + '" style="' + img_style + '" />';
	if (name != '') {
		view += '<div style="border:1px solid #000000; background-color:#ffffff; padding:3px; text-align:center;">' + name + '</div>';
	}
	view += '</span></div>';

	$('body').append(view);
}

/* Effects
 */
function effect_create_object(effect_id, src, pos_x, pos_y, width, height) {
	width *= grid_cell_size;
	height *= grid_cell_size;

	var effect = $('<div id="' + effect_id +'" class="effect" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; width:' + width + 'px; height:' + height + 'px;"><img src="' + src + '" style="width:100%; height:100%;" /></div>');

	$('div.playarea div.effects').append(effect);
}

/* Measuring functions
 */
function measuring_stop() {
	$('div.playarea').off('mousemove');
	$('img.pin').remove();
}

/* Door functions
 */
function door_position(door) {
	var pos_x = parseInt(door.attr('pos_x')) * grid_cell_size;
	var pos_y = parseInt(door.attr('pos_y')) * grid_cell_size;
	var length = parseInt(door.attr('length')) * grid_cell_size;
	var direction = door.attr('direction');
	var state = door.attr('state');

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
		door.css('background-color', DOOR_SECRET);
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

function door_show_closed(door) {
	door.attr('state', 'closed');

	door.css('opacity', DOOR_OPACITY);
	door.css('background-color', door.attr('secret') == 'yes' ? DOOR_SECRET : '');
}

function door_show_open(door) {
	door.attr('state', 'open');

	door.css('opacity', DOOR_OPACITY);
	door.css('background-color', DOOR_OPEN);
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

	wall.css('display', 'none');

	wall.css('left', pos_x + 'px');
	wall.css('top', pos_y + 'px');
	wall.css('width', width + 'px');
	wall.css('height', height + 'px');
}

/* Zone functions
 */
function zone_create_object(id, pos_x, pos_y, width, height, color, opacity, group) {
	var id = 'zone' + id.toString();
	width *= grid_cell_size;
	height *= grid_cell_size;

	var zone = $('<div id="' + id + '" class="zone" style="position:absolute; left:' + pos_x + 'px; top:' + pos_y + 'px; background-color:' + color + '; width:' + width + 'px; height:' + height + 'px; opacity:' + opacity + ';" />');

	if (group != '') {
		zone.attr('group', group);
	}

	$('div.playarea div.zones').append(zone);
}

/* Marker functions
*/
function marker_create(pos_x, pos_y, name = null) {
	var marker = $('<div class="marker" style="position:absolute; z-index:' + LAYER_MARKER + '; left:' + pos_x + 'px; top:' + pos_y + 'px;"><img src="/images/marker.png" style="width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px;" /></div>');

	if (name != null) {
		marker.prepend('<span style="margin-bottom:3px">' + name + '</span>');
	}

	$('div.playarea div.markers').append(marker);
	setTimeout(function() {
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
				var collectable = '<div class="col-sm-4" style="width:115px; height:115px;" onClick="javascript:object_view($(this), 600);"><img src="/resources/' + resources_key + '/collectables/' + image + '" style="max-width:100px; max-height:100px; cursor:pointer;" /></div>';
				row.append(collectable);
			});
		}
	});
}

/* Journal functions
 */
function journal_add_entry(name, content) {
	var entry = '<div class="entry"><span class="writer">' + name + '</span><span class="content">' + content + '</span></div>';
	$('div.journal').append(entry);

	var panel = $('div.journal').parent();
	panel.prop('scrollTop', panel.prop('scrollHeight'));
}

function journal_show() {
	var panel = $('div.journal').parent();
	panel.prop('scrollTop', panel.prop('scrollHeight'));
}

/* Battle functions
 */
function battle_done() {
	write_sidebar('The battle is over!');
}

/* Condition functions
 */
function set_condition(obj, condition) {
	obj.find('span.conditions').remove();

	if (condition != '') {
		obj.append('<span class="conditions">' + condition + '</span>');
	}
}

function context_menu_handler(key, options) {
	var obj = $(this);
	if (obj.prop('tagName').toLowerCase() == 'img') {
		obj = obj.parent();
	}

	switch (key) {
		case 'info':
			object_info(obj);
			break;
		case 'sheet':
			var char_id = obj.attr('char_id');
			var sheet_url = $('div.characters div.character[char_id="' + char_id + '"]').attr('sheet');
			window.open(sheet_url, '_blank');
			break;
		case 'view':
			object_view(obj);
			break;
		default:
			write_sidebar('Unknown menu option: ' + key);
	}
}

function key_down(event) {
	switch (event.which) {
		case 9:
			// TAB
			toggle_fullscreen();
			break;
		case 27:
			// Escape
			$('div.menu').hide();
			break;
	}
}

/* Main
 */
$(document).ready(function() {
	group_key = $('div.playarea').attr('group_key');
	adventure_id = parseInt($('div.playarea').attr('adventure_id'));
	map_id = parseInt($('div.playarea').attr('map_id'));
	user_id = parseInt($('div.playarea').attr('user_id'));
	resources_key = $('div.playarea').attr('resources_key');
	grid_cell_size = parseInt($('div.playarea').attr('grid_cell_size'));
	var version = $('div.playarea').attr('version');
	var ws_host = $('div.playarea').attr('ws_host')
	var ws_port = $('div.playarea').attr('ws_port')

	write_sidebar('<img src="/images/cauldron.png" style="max-width:80px; display:block; margin:0 auto" draggable="false" />');
	write_sidebar('<b>Welcome to Cauldron v' + version + '</b>');

	if (window.location.search == '?spectate') {
		$('a.leave').attr('href', '/spectate');
		$('select.map-selector option').each(function() {
			$(this).val($(this).val() + '?spectate');
		});
	}

	/* Websocket
	 */
	websocket = new WebSocket('wss://' + ws_host + ':' + ws_port + '/');

	websocket.onopen = function(event) {
		var data = {
			group_key: group_key
		};
		websocket_send(data);

		write_sidebar('Connection established.');

		var data = {
			action: 'request_init',
			user_id: user_id
		};
		websocket_send(data);

		var data = {
			action: 'scan',
			user_id: user_id
		};
		websocket_send(data);
	}

	websocket.onmessage = function(event) {
		try {
			data = JSON.parse(event.data);
		} catch (e) {
			return;
		}

		if (data.adventure_id != adventure_id) {
			return;
		}

		delete data.adventure_id;
		delete data.user_id;

		switch (data.action) {
			case 'alternate':
				var img_size = data.size * grid_cell_size;
				$('div#' + data.char_id).find('img').attr('src', '/resources/' + resources_key + '/' + data.src);
				$('div#' + data.char_id).css('width', img_size + 'px');
				$('div#' + data.char_id).find('img').css('height', img_size + 'px');
				break;
			case 'audio':
				var audio = new Audio(data.filename);
				audio.play();
				break;
			case 'condition':
				var obj = $('div#' + data.object_id);
				set_condition(obj, data.condition);
				break;
			case 'create':
				var obj = '<div id="token' + data.instance_id + '" token_id="' + data.token_id +'" class="token" style="left:' + data.pos_x + 'px; top:' + data.pos_y + 'px; z-index:' + DEFAULT_Z_INDEX + '" type="' + data.type + '" is_hidden="no" rotation="0" armor_class="' + data.armor_class + '" hitpoints="' + data.hitpoints + '" damage="0" name="">' +
						  '<img src="' + data.url + '" style="width:' + data.width + 'px; height:' + data.height + 'px;" />' +
						  '</div>';
				$('div.playarea div.tokens').append(obj);
				$('div#token' + data.instance_id).on('contextmenu', object_contextmenu);
			case 'damage':
				var obj = $('div#' + data.instance_id);
				obj.attr('damage', data.damage);
				obj.find('div.damage').css('width', data.perc);
				if (data.perc == '100%') {
					object_dead(obj);
				} else {
					object_alive(obj);
				}
				break;
			case 'delete':
				var obj = $('div#' + data.instance_id);
				obj.remove();
				break;
			case 'done':
				battle_done();
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
				var img = new Image();
				img.src = data.brush;
				img.onload = function() {
					var pattern = drawing_ctx.createPattern(img, 'repeat');
					drawing_ctx.strokeStyle = pattern;
				};
				sleep(250);
				break
			case 'draw_clear':
				drawing_ctx.clearRect(0, 0, drawing_canvas.width, drawing_canvas.height);
				break
			case 'draw_color':
				drawing_ctx.beginPath();
				drawing_ctx.strokeStyle = data.color;
				break
			case 'draw_move':
				if (drawing_ctx.lineWidth > 1) {
					draw_circle(data.draw_x, data.draw_y);
				}
				drawing_ctx.beginPath();
				drawing_ctx.moveTo(data.draw_x, data.draw_y);
				break
			case 'draw_line':
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
			case 'hide':
				var obj = $('div#' + data.instance_id);
				object_hide(obj);
				break;
			case 'journal':
				journal_add_entry(data.name, data.content);
				write_sidebar(data.name + ' added a journal entry.');
				break;
			case 'light_create':
				break;
			case 'light_delete':
				break;
			case 'light_toggle':
				break;
			case 'marker':
				marker_create(data.pos_x, data.pos_y, data.name);
				break;
			case 'move':
				var obj = $('div#' + data.instance_id);

				if (obj.hasClass('light')) {
					obj.css('left', data.pos_x + 'px');
					obj.css('top', data.pos_y + 'px');
					break;
				}

				obj.stop(false, true);
				obj.animate({
					left: data.pos_x,
					top: data.pos_y
				}, data.speed);
				break;
			case 'reload':
				document.location = '/spectate/' + adventure_id;
				break;
			case 'reveal':
				if (reveal_message == false) {
					write_sidebar('Present in this map:');
					reveal_message = true;
				}
				write_sidebar('&ndash; ' + data.name);
				break;
			case 'rotate':
				var obj = $('div#' + data.instance_id);
				object_rotate(obj, data.rotation, data.speed);
				break;
			case 'say':
				message_to_sidebar(data.mesg, data.name);
				break;
			case 'shape':
				var size = parseInt(data.size)
				$('div#' + data.char_id).find('img').attr('src', '/resources/' + resources_key + '/' + data.src);
				$('div#' + data.char_id).css('width', (grid_cell_size * size) + 'px');
				$('div#' + data.char_id).find('img').css('height', (grid_cell_size * size) + 'px');
				break;
			case 'show':
				var obj = $('div#' + data.instance_id);
				object_show(obj);
				break;
			case 'zone_create':
				zone_create_object(data.instance_id, data.pos_x, data.pos_y, data.width, data.height, data.color, data.opacity, data.group);
				break;
			case 'zone_delete':
				$('div#' + data.instance_id).remove();
				break;
			case 'zone_group':
				if (data.zone_group != '') {
					$('div#' + data.zone_id).attr('group', data.zone_group);
				} else {
					$('div#' + data.zone_id).removeAttr('group');
				}
				break;
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
			map = $('div.playarea > div').first();
			map.css('background-position', '-' + map_offset_x + 'px -' + map_offset_y + 'px');
		} else {
			map.css('margin-left', '-' + map_offset_x + 'px');
			map.css('margin-top', '-' + map_offset_y + 'px');
		}
	}

	/* Drawing
	 */
	var map = $('div.playarea > div');
	var width = Math.round(map.width());
	var height = Math.round(map.height());

	$('div.drawing').prepend('<canvas id="drawing" class="drawing" width="' + width + '" height="' + height + '" />');
	drawing_canvas = document.getElementById('drawing');

	drawing_ctx = drawing_canvas.getContext('2d');
	drawing_ctx.lineWidth = DRAW_DEFAULT_WIDTH;
	drawing_ctx.strokeStyle = DRAW_DEFAULT_COLOR;

	/* Zones
	 */
	$('div.zone_create div.panel').draggable({
		handle: 'div.panel-heading',
		cursor: 'grab'
	});

	/* Doors
	 */
	$('div.door').each(function() {
		door_position($(this));
	});

	/* Walls
	 */
	$('div.wall[transparent="yes"]').addClass('window');

	$('div.wall').each(function() {
		wall_position($(this));
	});

	/* Objects
	 */
	if ($('video').length > 0) {
		$('video').on('loadeddata', function() {
			$('div.token[is_hidden=no]').each(function() {
				$(this).show();
			});
		});
		$('video').on('play', function() {
			$('button#playvideo').remove();
		});
		$('video').append('<source src="' + $('video').attr('source') + '"></source>');
	} else {
		$('div.token[is_hidden=no]').each(function() {
			$(this).show();
		});
	}

	$('div.character[is_hidden=yes]').each(function() {
		object_hide($(this));
	});

	$('div.token').each(function() {
		$(this).css('z-index', LAYER_TOKEN);
		object_rotate($(this), $(this).attr('rotation'), 0);

		if ($(this).attr('hitpoints') > 0) {
			if ($(this).attr('damage') == $(this).attr('hitpoints')) {
				object_dead($(this));
			}
		}
	});

	$('div.character').each(function() {
		$(this).css('z-index', LAYER_CHARACTER);
		object_rotate($(this), $(this).attr('rotation'), 0);
	});

	/* Menu tokens
	 */
	$('div.token img').on('contextmenu', object_contextmenu);

	/* Menu characters
	 */
	$('div.character img').on('contextmenu', function(event) {
		var menu_entries = {
			'info': {name:'Get information', icon:'fa-info-circle'},
			'view': {name:'View', icon:'fa-search'}
		};

		var char_id = $(this).parent().attr('char_id');
		var sheet = $('div.characters div.character[char_id="' + char_id + '"]').attr('sheet');
		if (sheet != '') {
			menu_entries['sheet'] = { name:'View character sheet', icon:'fa-file-text-o' };
		}

		context_menu_show($(this), event, menu_entries, context_menu_handler, LAYER_MENU);
		return false;
	});

	wf_collectables = $('<div class="collectables"></div>').windowframe({
		activator: 'button.show_collectables',
		width: 500,
		style: 'success',
		header: 'Inventory',
		open: collectables_show()
	});

	$('div.journal').windowframe({
		activator: 'button.show_journal',
		width: 800,
		height: 400,
		style: 'info',
		header: 'Journal',
		open: journal_show
	});

	$('select.map-selector').on('click', function(event) {
		event.stopPropagation();
	});

	var audio_file = $('div.playarea').attr('audio');
	if (audio_file != undefined) {
		var audio = new Audio(audio_file);
		audio.loop = true;
		audio.play();
	}

	$('body').keydown(key_down);

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

	/* Drag map
	 */
	$('div.playarea').on('mousedown', function(event) {
		if (event.button != 1) {
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

	/* Fullscreen
	*/
	$('button.fullscreen').on('click', function() {
		toggle_fullscreen();
	});

	/* Interface color
	 */
	$('button.interface_color').on('click', function() {
		interface_color($(this));
	});

	var color = localStorage.getItem('interface_color');
	if (color == 'dark') {
		interface_color($('button#itfcol'), false);
	}

	/* Touchscreens
	 */
	if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)) {
		$('div.character').on('click', function(event) {
			event.type = 'contextmenu';
			$(this).find('img').trigger(event);
		});
		$('div.token').on('click', function(event) {
			event.type = 'contextmenu';
			$(this).find('img').trigger(event);
		});
	}
});
