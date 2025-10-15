$(document).ready(function() {
	var sides = [4, 6, 8, 10, 12, 20];

	var select_type = '<div class="form-group"><label for="type">Dice type:</label>';
	select_type += '<select id="type" class="form-control">';
	sides.forEach(function(side) {
		select_type += '<option value="' + side + '">d' + side + '</option>';
	});
	select_type += '</select></div>';

	$('div.form-group').first().after(select_type);

	var sides = $('div#sides input').length;
	if (sides > 0) {
		$('select#type').val(sides);
	}

	$('select#type').on('change', function() {
		var type = $(this).val();
		var current = $('div#sides input').length;

		while (current++ < type) {
			var input = '<div class="input-group">' +
			            '<span class="input-group-addon">' + current + '</span>' +
			            '<input type="text" name="sides[]" class="form-control" />' +
			            '</div>';

			$('div#sides').append(input);
		}

		while (--current > type) {
			$('div#sides div.input-group:last-child').remove();
		}
	});

	$('select#type').trigger('change');
});
