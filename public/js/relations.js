const WIDTH = 1492;
const HEIGHT = 992;
const GRID_SIZE = 15;
const KEY_CTRL = 17;

var adventure_id = null;
var connections = [];
var canvas = null;
var ctx = null;

var ctrl_down = false;

var entity_half_width = null;
var entity_half_height = null;

var line_type = [[], [8, 6], [3, 4]];

function show_info_window(title, description, url) {
	var wf_info = $('<div class="description">' + description + '</div>').windowframe({
		header: title,
		footer: '<button type="button" onClick="javascript:window.location=\'' + url + '\'" class="btn btn-default btn-sm">Edit</button>',
		close: function() {
			wf_info.destroy();
		}
	});
	wf_info.open();
}

function draw_relations() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	$('div.entities div.connection').remove();

	connections.forEach(function(connection) {
		/* Draw line
		 */
		ctx.strokeStyle = connection.color;
		ctx.setLineDash(line_type[connection.type]);

		ctx.beginPath();

		var from = $('div[entity_id="' + connection.from + '"]');
		var from_pos = from.position();
		var from_left = Math.round(from_pos.left + entity_half_width);
		var from_top = Math.round(from_pos.top + entity_half_height);
		ctx.moveTo(from_left, from_top);

		var to = $('div[entity_id="' + connection.to + '"]');
		var to_pos = to.position();
		var to_left = Math.round(to_pos.left + entity_half_width);
		var to_top = Math.round(to_pos.top + entity_half_height);
		ctx.lineTo(to_left, to_top);

		ctx.stroke();

		/* Info icon
		 */
		var span = '<span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span>';
		var description = connection.description.replace(/"/g, '&quot;');
		var info = $('<div class="connection" description="' + description + '">' + span + '</div>');
		info.css({
			left: (((from_left + to_left) >> 1) - 12) + 'px',
			top: (((from_top + to_top) >> 1) - 12) + 'px'
		});
		info.on('click', function() {
			var description = $(this).attr('description');
			var url = '/relations/edit_connection/' + connection.id;

			show_info_window('Relation', description, url);
		});

		$('div.entities').append(info);
	});
}

$(document).ready(function() {
	adventure_id = $('div.view').attr('adventure_id');

	$('div.view').css('height', HEIGHT + 'px');
	$('canvas.connections').attr('width', WIDTH);
	$('canvas.connections').attr('height', HEIGHT);
	$('div.entities').css({
		width: WIDTH + 'px',
		height: HEIGHT + 'px'
	});

	/* Registering CTRL key press
	 */
    $('body').on('keydown', function(event) {
		if (event.which == KEY_CTRL) {
			ctrl_down = true;
		}
	}).on('keyup', function() {
		if (event.which == KEY_CTRL) {
			ctrl_down = false;
		}
	});

	/* Wide view button
	 */
	$('div.btn-group button.fullscreen').on('click', function() {
		var view = $('div.view');

		if (view.hasClass('normal')) {
			$('div.view').removeClass('normal').addClass('wide');
			localStorage.setItem('relations_wide', 'yes');
		} else {
			$('div.view').removeClass('wide').addClass('normal');
			localStorage.removeItem('relations_wide');
		}
	});

	var wide = localStorage.getItem('relations_wide');
	if (wide == 'yes') {
		$('div.btn-group button.fullscreen').trigger('click');
	}

	/* Draw entities
	 */
	$('entities entity').each(function() {
		var id = $(this).attr('id');
		var title = $(this).find('title').text();
		var description = $(this).find('description').text().replace(/"/g, '&quot;');
		var color = $(this).find('color').text();

		var entity = $('<div entity_id="' + id + '" class="entity" description="' + description + '" style="background-color:' + color + '">');
		entity.append('<span>' + title + '</span>');
		entity.append('<div class="print" style="border-color:' + color + '"></div></div>');
		$('div.entities').append(entity);

		var pos_x = $(this).attr('pos_x');
		var pos_y = $(this).attr('pos_y');

		var obj = $('div.entities div[entity_id="' + id + '"]');
		obj.css({
			left: pos_x + 'px',
			top: pos_y + 'px'
		});
	});

	/* Add connections to array
	 */
	$('connections connection').each(function() {
		var connection = {};
		connection.id = $(this).attr('id');
		connection.from = $(this).attr('from');
		connection.to = $(this).attr('to');
		connection.title = $(this).find('title').text();
		connection.color = $(this).find('color').text();
		connection.type = parseInt($(this).find('type').text());
		connection.description = $(this).find('description').text();

		connections.push(connection);
	});

	var entities = $('div.entities div.entity');

	/* Make entities draggable
	 */
	entities.draggable({
		containment: 'div.entities',
		drag: draw_relations,
		stop: function(event, ui) {
			var entity = ui.helper;

			var pos = entity.position();
			pos.left = Math.round(pos.left);
			pos.top = Math.round(pos.top);

			if (pos.left + (entity_half_width << 1) > WIDTH) {
				pos.left -= GRID_SIZE;
				entity.css('left', pos.left + 'px');
			}

			if (pos.top + (entity_half_height << 1) > HEIGHT) {
				pos.top -= GRID_SIZE;
				entity.css('top', pos.top + 'px');
			}

			$.post('/relations/move', {
				id: entity.attr('entity_id'),
				pos_x: pos.left,
				pos_y: pos.top
			}).fail(function() {
				alert('Your session has expired.');
			});

			$(this).draggable({
				grid: false
			});
		}
	});

	/* Entity double-click
	 */
	entities.on('dblclick', function() {
		var url = '/relations/edit_entity/' + $(this).attr('entity_id');
		var title = $(this).find('span').text();
		var description = $(this).attr('description');

		show_info_window(title, description, url);
	});

	/* Entity mouse-down
	 */
	entities.on('mousedown', function(event) {
		if (ctrl_down == false) {
			return;
		}

		var pos = $(this).position();
		pos.left = Math.round(pos.left);
		pos.top = Math.round(pos.top);

		pos.left = pos.left - (pos.left % GRID_SIZE);
		pos.top = pos.top - (pos.top % GRID_SIZE);

		$(this).css('left', pos.left + 'px');
		$(this).css('top', pos.top + 'px');

		$(this).draggable({
			grid: [GRID_SIZE, GRID_SIZE]
		});
	});

	/* Disable 'Add relation' button for insufficient entities
	 */
	if (entities.length < 2) {
		var button = $('div.buttons a:nth-child(2)');
		button.attr('disabled', 'disabled');
		button.attr('href', '#');
		button.on('click', function() {
			return false;
		});
	}

	var entity = $('div.entity').first();
	if (entity.length > 0) {
		entity_half_width = entity.outerWidth() >> 1;
		entity_half_height = entity.outerHeight() >> 1;
	}

	canvas = $('canvas.connections')[0];
	ctx = canvas.getContext('2d');
	ctx.lineWidth = 2;

	ctx.font = '12px Arial';
	ctx.textAlign = 'center';

	draw_relations();
});
