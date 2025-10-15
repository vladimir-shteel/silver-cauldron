$(document).ready(function() {
	var rule_systems = '<div class="btn-group rule_systems">\n';

	$('ul.rule_systems li').each(function() {
		var id = $(this).attr('id');
		var name = $(this).text();

		rule_systems += '<a href="/character/new/' + id + '" class="btn btn-default btn-block">' + name + '</a>\n';
	});

	rule_systems += '</div>';

	var wf_rule_system = $(rule_systems).windowframe({
		header: 'Select rule system',
		width: 400,
		activator: 'button.new'
	});
});
