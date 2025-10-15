function update_sheet_form() {
	var type = $('input[name="sheet"]:checked').val();

	switch (type) {
		case 'none':
			$('div.sheet_file').hide();
			$('div.sheet_url').hide();
			break;
		case 'file':
			$('div.sheet_file').show();
			$('div.sheet_url').hide();
			break;
		case 'url':
			$('div.sheet_file').hide();
			$('div.sheet_url').show();
			break;
	}
}

function token_selected() {
	$('div.token_type input').removeAttr('disabled');

	$('span.select').fadeIn(1000);
	$('span.select').fadeOut(1000);
	$('span.select').fadeIn(1000);
	$('span.select').fadeOut(1000);
	$('span.select').fadeIn(1000);
	$('span.select').fadeOut(1000);
}

$(document).ready(function() {
	update_sheet_form();

	$('input[name="sheet"]').on('change', update_sheet_form);
});
