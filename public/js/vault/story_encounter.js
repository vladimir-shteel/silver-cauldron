function add_monster() {
	var nr = $('div.monsters div.panel').length + 1;

	$('div.monsters').append(
		'<div class="panel panel-primary"><div class="panel-body">\n'+
		'<div class="form-group">\n' +
		'<label for="monster">Monster:</label>\n' +
		'<input type="text" name="monsters[' + nr + '][monster]" maxlength="50" class="form-control" />\n' +
		'</div>\n' +
		'<div class="form-group">\n' +
		'<label for="count">Number of monsters:</label>\n' +
		'<input type="text" name="monsters[' + nr + '][count]" class="form-control" />\n' +
		'</div>\n' +
		'<div class="form-group">\n' +
		'<label for="source">Source:</label>\n' +
		'<input type="text" name="monsters[' + nr + '][source]" maxlength="20" class="form-control" />\n' +
		'</div>\n' +
		'<div class="form-group">\n' +
		'<label for="cr">Challenge Rating:</label>\n' +
		'<input type="text" name="monsters[' + nr + '][cr]" class="form-control cr" />\n' +
		'</div>\n' +
		'</div></div>\n');
}

function cr_input_to_select() {
	var template = '<select class="form-control">\n';
	$('crs cr').each(function() {
		template += '<option>' + $(this).text() + '</option>\n';
	});
	template += "</select>\n";

	$('input.cr').each(function() {
		var select = $(template);
		select.attr('name', $(this).attr('name'));
		select.val($(this).attr('value'));
		$(this).after(select);
		$(this).remove();
	});
}

$(document).ready(function() {
	var delete_button = '<input type="button" value="Delete" class="btn btn-danger btn-xs" />';
	$('div.monsters div.panel-body').prepend(delete_button);
	$('div.monsters div.panel-body input.btn').css({
		float: 'right'
	}).on('click', function() {
		if (confirm('DELETE: Are you sure?')) {
			$(this).parent().parent().remove();
		}
		return false;
	});

	add_monster();
	cr_input_to_select();
});
