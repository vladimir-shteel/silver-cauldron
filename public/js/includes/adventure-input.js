
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
		case 'audio':
			wf_audio_player.open();
			break;
		case 'cauldron':
			write_sidebar('<img src="/images/cauldron.png" draggable="false" />');
			break;
		case 'clear':
			$('div.sidebar').empty();
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
		case 'roll':
			if (param == '') {
				dice_roll_window_open();
			} else if (roll_dice(param) == false) {
				write_sidebar('Invalid dice roll.');
				$('div.input input').val(input);
				return;
			}
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
			if (rule_system_handle_input(command, param) == false) {
				write_sidebar('Unknown command.');
				$('div.input input').val(input);
				return;
			}
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

	if (rule_system_context_menu_handler(key, obj)) {
		return;
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
		case 'coordinates':
			var pos_x = Math.round(coord_to_grid(mouse_x, false) / grid_cell_size);
			var pos_y = Math.round(coord_to_grid(mouse_y, false) / grid_cell_size);
			write_sidebar('Coordinates: ' + pos_x + ',' + pos_y);
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
				var mpos = viewport_to_map(event.clientX, event.clientY);
				var to_x = coord_to_grid(mpos.x, false);
				var to_y = coord_to_grid(mpos.y, false);

				ruler_position(to_x, to_y);
			});

			$('div.playarea').on('click', function(event) {
				if (ctrl_down == false) {
					measuring_stop();
					return;
				}

				ruler_previous = ruler_distance;

				var mpos = viewport_to_map(event.clientX, event.clientY);
				ruler_x = coord_to_grid(mpos.x, false);
				ruler_y = coord_to_grid(mpos.y, false);

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
		case KEY_SHIFT:
			shift_down = true;
			break;
		case KEY_CTRL:
			ctrl_down = true;
			break;
		case KEY_ALT:
			alt_down = true;
			break;
		case KEY_PAUSE_BREAK:
			if (dungeon_master) {
				$('div.menu button.pause').trigger('click');
			}
			break;
		case KEY_ESC:
			$('p.measure').remove();
			measuring_stop();
			open_windows.close();
			context_menu_remove();
			$('div.menu').hide();
			break;
		case KEY_TILDE:
			if ($('div.diceroll:visible').length > 0) {
				dice_roll_window_close();
			} else if (open_windows.length == 0) {
				dice_roll_window_open();
			}
			break;
	}

	if (open_windows.length > 0) {
		return;
	}

	switch (event.which) {
		case KEY_TAB:
			toggle_fullscreen();
			break;
		case KEY_F:
			if (dungeon_master && (focus_obj != null) && focus_obj.hasClass('character')) {
				object_show_fow(focus_obj);
			}
			break;
		case KEY_P:
			if (dungeon_master && focus_obj != null) {
				object_toggle_presence(focus_obj);
			}
			break;
	}
}

function key_up(event) {
	switch (event.which) {
		case KEY_SHIFT:
			shift_down = false;
			$('canvas#drawing').off('mousemove');
			break;
		case KEY_CTRL:
			ctrl_down = false;
			if (shift_down == false) {
				$('canvas#drawing').off('mousemove');
			}
			break;
		case KEY_ALT:
			alt_down = false;
			break;
	}
}
