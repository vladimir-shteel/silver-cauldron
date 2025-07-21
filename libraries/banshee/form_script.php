<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee;

	class form_script {
		const OPEN = "{{";
		const CLOSE = "}}";

		private $view = null;
		private $settings = null;
		private $content = null;
		private $elements = array();

		/* Constructor
		 *
		 * INPUT:  object view, object settings, string content containing script
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($view, $settings, $content) {
			$this->view = $view;
			$this->settings = $settings;
			$this->content = $content;

			$open_len = strlen(self::OPEN);
			$close_len = strlen(self::CLOSE);

			$number = 0;
			$begin = 0;
			while (($begin = strpos($content, self::OPEN, $begin)) !== false) {
				if (($end = strpos($content, self::CLOSE, $begin)) !== false) {
					$element = substr($content, $begin + $open_len, $end - $begin - $close_len);

					list($type, $label) = explode(" ", $element, 2);
					if ($required = ($type == "required")) {
						list($type, $label) = explode(" ", $label, 2);
					}

					$element = array(
						"type"     => $type,
						"label"    => $label,
						"pos"      => $begin,
						"length"   => $end + $close_len - $begin,
						"required" => $required);

					$this->elements["input_".$number] = $element;
					$number++;
				}

				$begin += ($end - $begin) + $close_len;
			}
		}

		/* Valid form script
		 *
		 * INPUT:  -
		 * OUTPUT: boolean valid form
		 * ERROR:  -
		 */
		public function valid_script() {
			$result = true;
			$valid_types = array("line", "email", "number", "text", "checkbox", "choice", "date");

			foreach ($this->elements as $elem_id => $element) {
				if (in_array($element["type"], $valid_types) == false) {
					$this->view->add_message("Invalid form element type '%s'.", $element["type"]);
					$result = false;
				} else if (trim($element["label"] == "")) {
					$this->view->add_message("Empty label for form element with type '%s'.", $element["type"]);
					$result = false;
				} else if ($element["type"] == "choice") {
					list($element["label"], $answers) = explode(":", $element["label"], 2);
					$answers = explode("/", $answers);
					if (count($answers) < 2) {
						$this->view->add_message("Too few options for 'choice' with label '%s'.", $element["label"]);
						$result = false;
					}
				}
			}

			return $result;
		}

		/* Generate form
		 *
		 * INPUT:  [array POST data]
		 * OUTPUT: string HTML
		 * ERROR:  -
		 */
		public function generate_form($post = array()) {
			$html = $this->content;
			$elements = array_reverse($this->elements, true);

			foreach ($elements as $elem_id => $element) {
				$message = new message($post[$elem_id] ?? "");
				$value = $message->unescaped_output();

				switch ($element["type"]) {
					case "line":
					case "email":
					case "number":
						$item = "<input type=\"text\" id=\"".$elem_id."\" name=\"".$elem_id."\" value=\"".$value."\" class=\"form-control\" >\n";
						break;
					case "text";
						$item = "<textarea id=\"".$elem_id."\" name=\"".$elem_id."\" class=\"form-control\">".$value."</textarea>\n";
						break;
					case "checkbox":
						$item = "<input type=\"checkbox\" id=\"".$elem_id."\" name=\"".$elem_id."\"".(is_true($value) ? " checked" : "")." />\n";
						break;
					case "choice":
						list($element["label"], $answers) = explode(":", $element["label"], 2);
						$answers = explode("/", $answers);
						$item = "<select id=\"".$elem_id."\" name=\"".$elem_id."\" class=\"form-control\">\n";
						if ($element["required"] == false) {
							$item .= "<option".($value == "" ? " selected" : "")."></option>\n";
						}
						foreach ($answers as $answer) {
							$item .= "<option".($value == $answer ? " selected" : "").">".$answer."</option>\n";
						}
						$item .= "</select>\n";
						break;
					case "date":
						$this->view->add_javascript("banshee/datepicker.js");
						$item = "<input type=\"text\" id=\"".$elem_id."\" name=\"".$elem_id."\" value=\"".$value."\" class=\"form-control datepicker\" >\n";
						break;
					default:
						$item = "<div>Unknown form element defined.</div>\n";
				}

				$separator = in_array(substr($element["label"], -1), array(":", ".", "?")) ? "" : ":";
				$item = "<label for=\"".$elem_id."\">".$element["label"].$separator.
				        ($element["required"] ? "<span class=\"required\">*</span>" : "").
				        "</label>\n".$item;

				$head = substr($html, 0, $element["pos"]);
				$tail = substr($html, $element["pos"] + $element["length"]);
				$html = $head.$item.$tail;
			}

			return $html;
		}

		/* Handle POST
		 *
		 * INPUT:  array POST data, string page title, string recipient e-mail address, object user
		 * OUTPUT: true
		 * ERROR:  false
		 */
		public function handle_post($post, $page_title, $email_address, $user) {
			$sender_email = $this->settings->webmaster_email;
			$sender_name = null;
			$valid_post = true;

			foreach ($this->elements as $elem_id => $element) {
				if (($post[$elem_id] ?? null) != "") {
					switch ($element["type"]) {
						case "checkbox":
							$post[$elem_id] = show_boolean($post[$elem_id]);
							break;
						case "email":
							if (valid_email($post[$elem_id]) == false) {
								$this->view->add_message("The field '%s' does not contain a valid e-mail address.", $element["label"]);
								$valid_post = false;
							}
							$sender = $post[$elem_id];
							break;
						case "number":
							if (valid_input($post[$elem_id], VALIDATE_NUMBERS) == false) {
								$this->view->add_message("The field '%s' does not contain a valid number.", $element["label"]);
								$valid_post = false;
							}
							break;
						case "date":
							if (valid_date($post[$elem_id]) == false) {
								$this->view->add_message("The field '%s' does not contain a date.", $element["label"]);
								$valid_post = false;
							}
					}
				} else if ($element["required"]) {
					$this->view->add_message("The field '%s' cannot be empty.", $element["label"]);
					$valid_post = false;
				}
			}

			if ($valid_post == false) {
				return false;
			}

			$result = "<table>\n";
			if ($user->logged_in) {
				$result .= "<tr><td>Name:</td><td>".$user->fullname."</td></tr>\n";
				$result .= "<tr><td>Group:</td><td>".$user->organisation."</td></tr>\n";
				$sender_email = $user->email;
				$sender_name = $user->fullname;
			}
			foreach ($this->elements as $elem_id => $element) {
				if ($element["type"] == "choice") {
					list($element["label"], $answers) = explode(":", $element["label"], 2);
				}

				$message = new message($post[$elem_id]);
				$value = $message->unescaped_output();

				$result .= sprintf("<tr><td>%s:</td><td>%s</td></tr>\n", $element["label"], $value);
			}
			$result .= "</table>\n";

			$subject = sprintf("Submit at %s form at %s website", $page_title, $this->settings->head_title);
			$mail = new \cauldron_email($subject, $sender_email, $sender_name);
			if ($user->logged_in) {
				$mail->reply_to($user->email, $user->fullname);
			}
			$message = file_get_contents("../extra/form_submit.txt");
			$mail->set_message_fields(array(
				"RESULT"  => $result,
				"TITLE"   => $page_title,
				"URL"     => $_SERVER["HTTP_SCHEME"]."://".$_SERVER["SERVER_NAME"],
				"WEBSITE" => $this->settings->head_title));
			$mail->message($message);

			if ($mail->send($email_address) == false) {
				$this->view->add_message("Error while sending form data via e-mail.");
				return false;
			}

			return true;
		}
	}
?>
