
/* Quick dice bar
 */
var dice_quick_open = true;

function quick_roll(sides) {
	var count = Math.max(1, Math.min(20, parseInt($('#dice-quick-count').val()) || 1));
	var mod   = parseInt($('#dice-quick-mod').val()) || 0;

	var notation = count + 'd' + sides;
	if (mod > 0)      notation += ' + ' + mod;
	else if (mod < 0) notation += ' - ' + Math.abs(mod);

	$('#dice-quick-count').val(1);
	$('#dice-quick-mod').val('');

	if (dice_quick_open) {
		roll_dice(notation, true);
		return;
	}

	/* Hidden mode
	 * - GM rolling:     animation + result only for GM, players see nothing
	 * - Player rolling: roll forwarded to GM silently, player sees confirmation
	 */
	var parsed = dice_roll_parse_string(notation);
	if (parsed === false) return;
	var dice_arr = parsed[0];
	var addition = parsed[1];
	var seed = Math.floor(Math.random() * 0xFFFFFFFF);

	if (dungeon_master) {
		dice_roll_hidden_local(dice_arr, addition, notation, seed, null);
	} else {
		websocket_send({
			action:   'dice_roll_hidden',
			dice:     dice_arr,
			seed:     seed,
			notation: notation,
			addition: addition,
			name:     character_name
		});
		write_sidebar('🎲 Hidden roll sent to GM.');
	}
}

function dice_roll_hidden_local(dice_arr, addition, notation, seed, roller_name) {
	var callback = function(rolls) {
		var prefix  = roller_name ? roller_name + ' (hidden): ' : 'Hidden roll: ';
		var message = prefix + notation + '\n';
		var total   = addition;
		rolls.forEach(function(r) { total += r; });
		message += '[' + rolls.join('] + [') + ']';
		if (addition > 0)      message += ' + ' + addition;
		else if (addition < 0) message += ' - ' + Math.abs(addition);
		message += ' = ' + total;
		write_sidebar(message);
	};

	if ((localStorage.getItem('dice_type') == 'animated') && (typeof dice_roll_3d == 'function')) {
		dice_roll_3d(dice_arr, callback, seed);
	} else {
		dice_roll_quick(dice_arr, callback);
	}
}

function dice_quick_count(delta) {
	var v = Math.max(1, Math.min(20, (parseInt($('#dice-quick-count').val()) || 1) + delta));
	$('#dice-quick-count').val(v);
}

function dice_quick_toggle() {
	dice_quick_open = !dice_quick_open;
	var btn = $('#dice-quick-toggle');
	if (dice_quick_open) {
		btn.html('&#x1F513; Open').removeClass('btn-danger').addClass('btn-success');
	} else {
		btn.html('&#x1F512; Hidden').removeClass('btn-success').addClass('btn-danger');
	}
}

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

function apply_zoom() {
	$('div.playarea > div').css({
		'transform': 'translate(' + zoom_tx + 'px, ' + zoom_ty + 'px) scale(' + zoom_level + ')',
		'transform-origin': '0 0'
	});
}

function screen_scroll() {
	var scr = {};

	scr.left = Math.round(-zoom_tx / zoom_level);
	scr.top = Math.round(-zoom_ty / zoom_level);

	return scr;
}

/* Convert a viewport (clientX/clientY) coordinate to a map coordinate,
 * correctly accounting for zoom level and pan offset.
 */
function viewport_to_map(clientX, clientY) {
	var pa = $('div.playarea').offset();
	return {
		x: (clientX - pa.left - zoom_tx) / zoom_level,
		y: (clientY - pa.top  - zoom_ty) / zoom_level
	};
}

function store_mouse_position(event) {
	var mac = (window.navigator.platform == 'MacIntel');
	if ((event.which == 3) || (mac && (event.which == 1) && (ctrl_down))) {
		var pos = viewport_to_map(event.clientX, event.clientY);
		mouse_x = pos.x;
		mouse_y = pos.y;
	}
}

function scroll_to_my_character(speed = 1000) {
	var half_w = $('div.playarea').width() >> 1;
	var half_h = $('div.playarea').height() >> 1;

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

	var target_tx = half_w - (pos.left + (grid_cell_size >> 1)) * zoom_level;
	var target_ty = half_h - (pos.top  + (grid_cell_size >> 1)) * zoom_level;

	if (speed <= 0) {
		zoom_tx = target_tx;
		zoom_ty = target_ty;
		apply_zoom();
	} else {
		$({tx: zoom_tx, ty: zoom_ty}).animate({tx: target_tx, ty: target_ty}, {
			duration: speed,
			step: function() {
				zoom_tx = this.tx;
				zoom_ty = this.ty;
				apply_zoom();
			},
			complete: function() {
				zoom_tx = target_tx;
				zoom_ty = target_ty;
				apply_zoom();
			}
		});
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

function playarea_click() {
	if (focus_obj != null) {
		focus_obj.find('img').css('border', '');
		focus_obj = null;
	}
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

			if ((close = message.indexOf('[/' + tag + ']', end)) == -1) {
				continue;
			}

			content = message.substring(end + 1, close);
			end = close + tag.length + 2;

			var replacement = rule_system_sidebar_message_bbcode(tag, content);
			if (replacement === false) {
				switch (tag) {
					case 'b':
						replacement = '<b>' + content + '</b>';
						break;
					case 'target':
						if (params == null) {
							continue;
						}

						var mouse_over = 'onMouseOver="javascript:highlight_target(\'' + params + '\')"';
						var mouse_out = 'onMouseOut="javascript:unhighlight_target(\'' + params + '\')"';
						replacement = '<span ' + mouse_over + '' + mouse_out + ' class="target">' + content + '</span>';
						break;
					default:
						continue;
				}
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

	var commands_dm = {
		'dmroll &lt;dice&gt;':   'Privately roll dice.',
		'night 0-4':             'Set map night mode.',
		'noscript':              'Disable all zone scripts.',
		'ping':                  'See who\'s online in the session.',
		'reload':                'Force everyone in the session to reload the map.',
		'walls hide|show':       'Manage walls and windows visibility.'
	};

	var commands_rs = {};

	if (dungeon_master) {
		commands_rs = rule_system_help_dm();
	} else {
		commands_rs = rule_system_help_player();
	}

	var help = [];
	Object.assign(commands, commands_dm, commands_rs);
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
