
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
