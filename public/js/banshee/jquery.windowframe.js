/* Copyright (C) by Hugo Leisink <hugo@leisink.net>
 * This file is part of the Banshee PHP framework
 * https://www.banshee-php.org/
 *
 * Licensed under The MIT License
 */

(function($) {
	const WINDOWFRAME_Z_INDEX = 11000;
	const MARGIN_BOTTOM = 30;

	var pluginName = 'windowframe';
	var defaults = {
		activator: undefined,
		top: undefined,
		width: 600,
		height: undefined,
		style: 'primary',
		header: 'Window Frame',
		footer: '',
		info: undefined,
		buttons: {},
		open: undefined,
		close: undefined
	};

	var mouse_offset_x;
	var mouse_offset_y

	/* Constructor
	 */
	var plugin = function(el, options) {
		var element = $(el);
		var settings = $.extend({}, defaults, options);
		var id = $('div.windowframe_overlay div.panel').length;

		element.data('windowframe_id', id);
		element.data('settings', settings);

		if ($('div.windowframe_overlay').length == 0) {
			/* Gray overlay
			 */
			var overlay = '<div class="windowframe_overlay"></div>';
			$('body').append(overlay);
			$('div.windowframe_overlay').mousedown(windowframe_close);
			$('div.windowframe_overlay').css({
				display: 'none', position: 'fixed',
				top: 0, right: 0, bottom: 0, left: 0,
				backgroundColor: 'rgba(0, 0, 0, 0.6)',
				zIndex: WINDOWFRAME_Z_INDEX,
			});
		}

		var close_button = '<span class="glyphicon glyphicon-remove close" aria-hidden="true"></span>';
		var info_button = '<span class="glyphicon glyphicon-info-sign close" aria-hidden="true" style="margin-right:10px"></span>';
		var windowframe = '<div id="windowframe' + id + '" class="panel panel-' + settings.style + '" onMouseDown="javascript:event.stopPropagation()">' +
		             '<div class="panel-heading"><span class="title">' + settings.header + '</span>' + close_button + (settings.info != undefined ? info_button : '') + '</div>' +
		             '<div class="panel-body"></div>' +
					 (settings.footer != '' ? '<div class="panel-footer">' + settings.footer + '</div>' : '') +
		             '</div>';
		$('div.windowframe_overlay').append(windowframe);

		windowframe = $('div.windowframe_overlay div#windowframe' + id);

		windowframe.find('span.glyphicon-remove').click(windowframe_close);
		windowframe.find('span.glyphicon-remove').mousedown(function(event) {
			event.stopPropagation();
		});

		/* Add body
		 */
		var body = element.detach();
		windowframe.find('div.panel-body').append(body.show());

		/* Add buttons
		 */
		if (Object.keys(settings.buttons).length > 0) {
			var buttons = $('<div class="btn-group"></div>');
			for ([label, action] of Object.entries(settings.buttons)) {
				var button = '<button class="btn btn-default">' + label + '</button>';
				buttons.append($(button).click(action));
			}
			windowframe.find('div.panel-body').append(buttons);
		}

		/* Style
		 */
		windowframe.css({
			display: 'none', position: 'absolute',
			boxShadow: '10px 10px 20px #303030',
			maxWidth: settings.width + 'px',
			width: '100%', zIndex: 1,
			marginBottom: '0px'
		});
		if (settings.height != undefined) {
			windowframe.find('div.panel-body').css({
				maxHeight: settings.height + 'px',
				overflowY: 'auto'
			});
		}

		/* Info
		 */
		if (settings.info != undefined) {
			var info_window = $('<div>' + settings.info + '</div>').windowframe({
				header: 'Info',
				width: 515,
				style: settings.style,
				activator: 'div#windowframe' + id + ' span.glyphicon-info-sign'
			});

			windowframe.data('info', info_window.parent().parent());
		}

		/* Draggable
		 */
		windowframe.draggable({
			containment: 'div.wrapper',
			handle: 'div.panel-heading',
			start: function() {
				$(this).css('cursor', 'grab');
			},
			stop: function() {
				$(this).css('cursor', '');
			}
		});

		if (settings.activator != undefined) {
			$(settings.activator).click(function() {
				element.open();
			});
		}
	};

	/* Functions
	 */
	var windowframe_to_top = function(windowframe) {
		$('div.windowframe_overlay').append(windowframe);
	}

	var unselect_text = function() {
		if (window.getSelection || document.getSelection) {
			window.getSelection().removeAllRanges();
		} else {
			document.selection.empty();
		}
	}

	var windowframe_open = function(param) {
		var windowframe_id = $(this).data('windowframe_id');
		var settings = $(this).data('settings');
		var windowframe = $('div.windowframe_overlay div#windowframe' + windowframe_id);
		windowframe.data('param', param);

		windowframe_to_top(windowframe);

		windowframe.fadeIn(500);
		$('div.windowframe_overlay').show();

		/* Center windowframe
		 */
		var left = Math.round((window.innerWidth / 2) - (settings.width / 2));
		if (left < 0) {
			left = 0;
		}
		windowframe.css('left', left + 'px');

		var height = windowframe.outerHeight(false);
		if (settings.top == undefined) {
			var top = Math.round((window.innerHeight / 2.5) - (height / 2));
			if (top < 0) {
				top = 0;
			}
			windowframe.css('top', top + 'px');
		} else {
			windowframe.css('top', settings.top);
		}

		var pos = windowframe.position();
		var bottom = pos.top + height;
		if (bottom > window.innerHeight - MARGIN_BOTTOM) {
			windowframe.find('div.panel-body').css({
				maxHeight: (height - (bottom - window.innerHeight) - 45 - MARGIN_BOTTOM) + 'px',
				overflowY: 'auto'
			});
		}

		if (settings.open != undefined) {
			settings.open();
		}
	};

	var windowframe_hide = function(windowframe) {
		var body = windowframe.find('div.panel-body').children().first();
		var settings = body.data('settings');

		if (settings.close != undefined) {
			if (settings.close() === false) {
				return;
			}
		}

		windowframe.hide();

		if (settings.height != undefined) {
			windowframe.find('div.panel-body').css({
				maxHeight: settings.height + 'px'
			});
		} else {
			windowframe.find('div.panel-body').css({
				maxHeight: ''
			});
		}
	}

	var windowframe_close = function() {
		// close via javascript?
		var windowframe_id = $(this).attr('id');
		if (windowframe_id == undefined) {
			// close via panel header close button?
			windowframe_id = $(this).parent().parent().attr('id');
			if (windowframe_id == undefined) {
				// close via panel body button?
				windowframe_id = $(this).parent().parent().parent().attr('id');
			}
		}
		// else close via overlay click

		if (windowframe_id == undefined) {
			$('div.windowframe_overlay div.panel:visible').each(function() {
				windowframe_hide($(this));
			});
		} else {
			var frame = $('div.windowframe_overlay div#' + windowframe_id);
			windowframe_hide(frame);

			var info = frame.data('info');
			if (info != undefined) {
				windowframe_hide(info);
			}
		}

		if ($('div.windowframe_overlay div.panel:visible').length == 0) {
			$('div.windowframe_overlay').hide();
		}
	};

	var windowframe_reset = function() {
		var windowframe_id = $(this).parent().parent().parent().attr('id');

		var form = $('div.windowframe_overlay div#windowframe' + windowframe_id + ' form');
		if (form.length > 0) {
			form.trigger('reset');
			return;
		}

		/* Clear form manually
		 */
		$('div.windowframe_overlay div#' + windowframe_id + ' input[type=text]').each(function() {
			$(this).val('');
		});

		$('div.windowframe_overlay div#' + windowframe_id + ' input[type=checkbox]').each(function() {
			$(this).prop('checked', false);
		});

		$('div.windowframe_overlay div#' + windowframe_id + ' input[type=radio]').each(function() {
			$(this).prop('checked', false);
		});

		$('div.windowframe_overlay div#' + windowframe_id + ' textarea').each(function() {
			$(this).val('');
		});

		$('div.windowframe_overlay div#' + windowframe_id + ' select').each(function() {
			$(this).val($(this).find("option:first").val());
		});
	}

	var get_body = function() {
		var windowframe_id = $(this).data('windowframe_id');
		return $('div.windowframe_overlay div#windowframe' + windowframe_id + ' div.panel-body').children().first();
	}

	var set_footer = function(text) {
		var windowframe = $('div.windowframe_overlay div#windowframe' + $(this).data('windowframe_id'));

		if (text === null) {
			windowframe.find('div.panel-footer').remove();
			return;
		}

		if (windowframe.find('div.panel-footer').length == 0) {
			windowframe.append('<div class="panel-footer"></div>');
		}

		windowframe.find('div.panel-footer').html(text);
	}

	var destroy = function() {
		var windowframe_id = $(this).data('windowframe_id');
		var windowframe = $('div.windowframe_overlay div#windowframe' + windowframe_id);

		var info = windowframe.data('info');
		if (info != undefined) {
			info.remove();
		}

		windowframe.remove();

		delete $(this);

		if ($('div.windowframe_overlay div.panel:visible').length == 0) {
			$('div.windowframe_overlay').hide();
		}
	}

	/* JQuery prototype
	 */
	$.fn[pluginName] = function(options) {
		return this.each(function() {
			(new plugin(this, options));
		});
	};

	$.fn.extend({
		open: windowframe_open,
		close: windowframe_close,
		reset: windowframe_reset,
		body: get_body,
		footer: set_footer,
		destroy: destroy
	});
})(jQuery);
