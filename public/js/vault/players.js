$(document).ready(function() {
	var max = 0;

	$('div.row div.panel').each(function() {
		var height = $(this).height();

		if (height > max) {
			max = height;
		}
	});

	max = Math.ceil(max).toString();

	$('div.row div.panel').css('height', max + 'px');
});
