<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee\Core;

	/* Exception handler
	 *
	 * INPUT:  error object
	 * OUTPUT: -
	 * ERROR:  -
	 */
	function exception_handler($error) {
		$previous = ob_get_clean();

		header("Content-Type: text/html");
		print "<!DOCTYPE html><html><body>\n";
		print "<h1>Cauldron VTT exception</h1>\n";

		if (is_true(DEBUG_MODE)) {
			printf("<p style=\"white-space:pre-wrap\">%s</p>\n", $error->getMessage());
			printf("<p>line %d in %s.</p>\n",  $error->getLine(), $error->getFile());
		} else {
			printf("<p>I'm sorry you encountered this error. The website administrator has been notified about the problem. It will be solved soon.</p>\n");
			$message = sprintf("%s=> %s\nline %d in %s\n", $previous, $error->getMessage(), $error->getLine(), $error->getFile());
			$error_handler = new website_error_handler($GLOBALS["_view"] ?? null, $GLOBALS["_settings"] ?? null, $GLOBALS["_user"] ?? null);
			$error_handler->execute($message);
		}

		print "</body></html>\n";
	}

	/* Error handler
	 *
	 * INPUT:  int error number, string error string, string filename, int line number
	 * OUTPUT: -
	 * ERROR:  -
	 */
	function error_handler($errno, $errstr, $errfile, $errline) {
		printf("=> %s\nline %d in %s\n", $errstr, $errline, $errfile);

		return true;
	}

	/* Generate backtrace
	 *
	 * INPUT:  -
	 * OUTPUT: -
	 * ERROR:  -
	 */
	function error_backtrace() {
		$trace = debug_backtrace();
		array_shift($trace);

		$path_offset = strlen(__FILE__) - 33;

		$result = "\nBacktrace:\n";
		foreach ($trace as $step) {
			$result .= sprintf("- %s() at line %d in %s.\n", $step["function"], $step["line"], substr($step["file"], $path_offset));
		}

		return $result;
	}

	/* Website error handler class
	 */
	final class website_error_handler {
		private $view = null;
		private $settings = null;
		private $user = null;

		/* Constructor
		 *
		 * INPUT:  object view, object settings, object user
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($view, $settings, $user) {
			$this->view = $view;
			$this->settings = $settings;
			$this->user = $user;
		}

		/* Add errors to output
		 *
		 * INPUT:  string errors
		 * OUTPUT: -
		 * ERROR:  -
		 */
		private function add_to_view($errors) {
			if ($this->view == null) {
				return;
			}

			$errors = htmlentities($errors);
			$errors = str_replace("\t", "    ", $errors);
			$errors = explode("\n", $errors);

			$result = "";
			foreach ($errors as $error) {
				$len = strlen($error);
				$error = ltrim($error);
				if (($len = $len - strlen($error)) > 0) {
					$result .= str_repeat("&nbsp;", $len);
				}
				$result .= $error."<br />\n";
			}

			$this->view->add_css("banshee/internal_error.css");
			$this->view->add_tag("internal_errors", $result);
		}

		/* Send errors via e-mail to webmaster
		 *
		 * INPUT:  string errors
		 * OUTPUT: -
		 * ERROR:  -
		 */
		private function send_via_email($errors) {
			if (($this->user == null) || ($this->settings == null)) {
				return;
			}

			$username = $this->user->username;
			$message =
				"Date, time: ".date("j F Y, H:i:s")."\n".
				"Used URL  : ".$_SERVER["REQUEST_URI"]."\n".
				"IP address: ".$_SERVER["REMOTE_ADDR"]."\n".
				"Username  : ".(isset($username) ? $username : "-")."\n".
				"User-Agent: ".$_SERVER["HTTP_USER_AGENT"]."\n".
				"\n".$errors;

			$email = new \Banshee\Protocol\email("Internal error at ".$_SERVER["SERVER_NAME"], "no-reply@".$_SERVER["SERVER_NAME"]);
			$email->message($message);
			$email->send($this->settings->webmaster_email);
			unset($email);
		}

		/* Handle website errors
		 *
		 * INPUT:  string errors
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function execute($errors) {
			$errors = str_replace("<br />", "", trim($errors));

			debug_log($errors);

			if (is_false(DEBUG_MODE) || $this->view->disabled) {
				$this->send_via_email($errors);
			} else {
				$this->add_to_view($errors);
			}
		}
	}

	/* Error handling settings
	 */
	ini_set("display_errors", 1);
	error_reporting(E_ALL & ~E_NOTICE);
	set_exception_handler("Banshee\\Core\\exception_handler");
	set_error_handler("Banshee\\Core\\error_handler", E_ALL & ~E_NOTICE);
?>
