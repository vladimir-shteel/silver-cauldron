const dungeon_master = true;
const character_name = '';

function send_message(message, name) {
}

function write_sidebar(message) {
	cauldron_alert(message);

	var container = $('div.diceroll').parent().parent();

	if (container.find('div.history').length == 0) {
		container.append('<h2>Previous rolls</h2>');
		container.append('<div class="history"></div>');
	}

	container.find('div.history').prepend('<pre>' + message + '</pre>');
}

function sortable_events() {
	var adventure_id = $('form.adventures_pulldown select').val();

	$('div.sortable').sortable({
		handle: 'div.handle',
		update: function(event, ui) {
			var items = [];
			ui.item.parent().find('div.item').each(function() {
				items.push($(this).attr('item_id'));
			});
			$.post('/vault/story', {
				adventure_id: adventure_id,
				type: ui.item.parent().attr('type'),
				order: items
			}).done(function() {
			});
		}
	});

	$('div.sortable').find('div.handle').on('click', function(event) {
		event.stopPropagation();
		return false;
	});
}

function filter_reset() {
	$('div.story div.row').show();
	$('div.story').unmark();
}

function filter_adjust() {
	filter_reset();

	var filter = $('div.filter input[type="text"]').val().toLowerCase();
	if (filter == '') {
		folding_set_all();
		return;
	}

	var mark_options = { separateWordSearch: false };

	var sections = [ 'npcs', 'objects', 'events', 'encounters' ];
	sections.forEach(function(section) {
		$('div.' + section).each(function() {
			if ($(this).text().toLowerCase().indexOf(filter) == -1) {
				$(this).hide();
			} else {
				$(this).mark(filter, mark_options);
			}
		});
	});
}

function filter_clear() {
	$('div.filter input[type="text"]').val('');

	filter_reset();

	folding_set_all();
}

function folding_set_all() {
	$('h2 button').each(function() {
		folding_set($(this))
	});
}

function folding_set(button) {
	var open = button.hasClass('fa-chevron-up');
	var h2 = button.parent();

	h2.nextUntil('h2').each(function() {
		var selection = $(this).hasClass('row') ? $(this) : $(this).find('div.row');

		if (open) {
			selection.show();
		} else {
			selection.hide();
		}
	});
}

$(document).ready(function() {
	sortable_events();

	$('div.item div.header').each(function() {
		var name = $(this).text();

		var pos = name.indexOf(']');
		if ((name.substring(0, 1) == '[') && (pos > 0)) {
			name = '<span class="section">' + name.substr(1);
			name = name.replace(']', '</span>');

			$(this).html(name);
		}
	});

	$('div.row div.header').on('click', function() {
		if ($(this).hasClass('handle') == false) {
			$(this).parent().parent().toggleClass('collapsed');
		}
	});

	/* Fold sections
	 */
	var button = '<button class="btn btn-default btn-xs fa fa-chevron-up"></button>';
	var nr = 1;
	$('h2:not(:first)').each(function() {
		$(this).append(button);
		$(this).find('button').attr('nr', nr++);
	});

	$('h2 button').css('float', 'right').on('click', function() {
		var button_nr = $(this).attr('nr');

		if ($(this).hasClass('fa-chevron-up')) {
			$(this).removeClass('fa-chevron-up');
			$(this).addClass('fa-chevron-down');
			localStorage.setItem('story_fold_' + button_nr, true);
		} else {
			$(this).removeClass('fa-chevron-down');
			$(this).addClass('fa-chevron-up');
			localStorage.setItem('story_fold_' + button_nr, false);
		}

		folding_set($(this));
	});

	$('h2 button').each(function() {
		var button_nr = $(this).attr('nr');

		if (localStorage.getItem('story_fold_' + button_nr) == 'true') {
			$(this).trigger('click');
		}
	});

	$('div.body').on('dblclick', function() {
		if (window.getSelection) {
			window.getSelection().removeAllRanges();
		} else if (document.selection) {
			document.selection.empty();
		}
	});

	filter_adjust();

	/* Show spells
	 */
	spells_initialize();

	$('button.show_spells').on('click', function() {
		show_spells();
	});

	/* Roll dice
	 */
	dice_roll_initialize();
});
