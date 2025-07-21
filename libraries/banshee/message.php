<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://gitlab.com/hsleisink/banshee/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee;

	class message {
		private $message = null;
		private $bbcodes = null;
		private $smilies = null;
		private $is_spam = null;

		/* Constructor
		 *
		 * INPUT:  string message
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($message) {
			$this->message = $message;
		}

		/* Magic method get
		 *
		 * INPUT:  string key
		 * OUTPUT: mixed value
		 * ERROR:  null
		 */
		public function __get($key) {
			switch ($key) {
				case "content":
					return $this->message;
				case "is_spam":
					if ($this->is_spam === null) {
						$this->is_spam = $this->message_is_spam();
					}
					return $this->is_spam;
			}

			return null;
		}

		/* Log spam information
		 */
		private function log_spam($reason) {
			$logfile = new logfile("spam");
			$logfile->add_entry($reason);
		}

		/* Determine whether a message is spam or not
		 *
		 * INPUT:  string message
		 * OUTPUT: boolean message is spam
		 * ERROR:  -
		 */
		private function message_is_spam() {
			$antispam = array();
			$index = false;

			/* Read the configuration file
			 */
			foreach (config_file("antispam") as $line) {
				if ($line[0] == "%") {
					$index = substr($line, 1);
					$antispam[$index] = array();
				} else if ($index === false) {
					list($key, $value) = explode("=", $line, 2);
					$antispam[trim($key)] = trim($value);
				} else {
					array_push($antispam[$index], $line);
				}
			}

			/* Check for blocked IP address
			 */
			foreach ($antispam["blocked_ip"] as $blocked_ip) {
				if ($_SERVER["REMOTE_ADDR"] == $blocked_ip) {
					$this->log_spam("blocked ip");
					return true;
				}
			}

			/* Check if POST is done too quickly
			 */
			if (isset($antispam["min_delay"])) {
				if (isset($_SESSION["last_visit"]) == false) {
					$this->log_spam("post without requesting form");
					return true;
				} else if (time() - $_SESSION["last_visit"] < $antispam["min_delay"]) {
					$this->log_spam("post too quickly");
					return true;
				}
			}

			/* Check for forbidden user agents
			 */
			foreach ($antispam["forbidden_user_agents"] as $agent) {
				if ($_SERVER["HTTP_USER_AGENT"] == $agent) {
					$this->log_spam("forbidden user agent: ".$agent);
					return true;
				}
			}

			/* Check for forbidden words
			 */
			foreach ($antispam["forbidden_words"] as $word) {
				if (stristr($this->message, $word) != false) {
					$this->log_spam("forbidden word: ".$word);
					return true;
				}
			}

			/* Check for maximum allowed number of links
			 */
			if (isset($antispam["max_links"])) {
				$link_count = substr_count($this->message, "[url") + substr_count($this->message, "http://") + substr_count($this->message, "https://");
				if ($link_count > $antispam["max_links"]) {
					$this->log_spam("+".$antispam["max_links"]." links");
					return true;
				}
			}

			/* Check for unreadable characters
			 */
			$letters = 0;
			$numbers = 0;
			$symbols = 0;
			$other   = 0;
			for ($i = 0; $i < strlen($this->message); $i++) {
				$char = $this->message[$i];
				if (($char >= "0") && ($char <= "9")) {
					$numbers++;
				} else if (($char >= "A") && ($char <= "Z")) {
					$letters++;
				} else if (($char >= "a") && ($char <= "z")) {
					$letters++;
				} else if (strchr(" !@#$^&*()_+-={}[]<>\|/;:,.'\"", $char) != false)  {
					$symbols++;
				} else {
					$other++;
				}
			}
			if ($other > ($letters + $numbers + $symbols)) {
				$this->log_spam("unreadable message");
				return true;
			}

			return false;
		}

		/* Prepare string for unescaped output
		 *
		 * INPUT:  -
		 * OUTPUT: string message
		 * ERROR:  -
		 */
		public function unescaped_output() {
			$this->message = htmlspecialchars($this->message);

			$chars = array("\r", "\n");
			$replace = array("", "<br />");
			$this->message = str_replace($chars, $replace, $this->message);

			return $this->message;
		}

		/* Add URL BBcodes to links
		 *
		 * INPUT:  -
		 * OUTPUT: string message
		 * ERROR:  -
		 */
		public function bbcode_for_links() {
			$this->message = preg_replace('/(http:\/\/[a-zA-Z0-9\.\/\-_\?&=\+%]*)/', '[url]$1[/url]', $this->message);
			$this->message = str_replace("[url][url]", "[url]", $this->message);
			$this->message = str_replace("[/url][/url]", "[/url]", $this->message);
			$this->message = str_replace("[img][url]", "[img]", $this->message);
			$this->message = str_replace("[/url][/img]", "[/img]", $this->message);

			return $this->message;
		}

		/* Get BBcodes left open
		 *
		 * INPUT:  string message
		 * OUTPUT: bool bbcodes left open
		 * ERROR:  -
		 */
		public function bbcodes_left_open() {
			$bbconfig = config_file("bbcodes");

			$result = array();

			foreach ($bbconfig as $line) {
				list($bbcode, $html) = explode("\t", $line, 2);
				if (strpos($html, "</") === false) {
					continue;
				}

				$open_count = substr_count($this->message, sprintf("[%s]", $bbcode));
				$open_param_count = substr_count($this->message, sprintf("[%s=", $bbcode));
				$close_count = substr_count($this->message, sprintf("[/%s]", $bbcode));

				if ($open_count + $open_param_count != $close_count) {
					array_push($result, $bbcode);
				}
			}

			return $result;
		}

		/* Translate single BBcode to HTML tag
		 *
		 * INPUT:  string BBcode, string HTML, string message
		 * OUTPUT: string translated message
		 * ERROR:  -
		 */
		private function translate_bbcode($bbcode, $html, $message, $show_url) {
			$max_loop = 25;

			do {
				$bblen = strlen($bbcode);
				$value = "";
				$param = "";

				/* Search for BBcode in message
				 */
				if (($open = strrpos($message, "[".$bbcode."]")) !== false) {
					$open_end = $open + $bblen + 1;
				} else if (($open = strrpos($message, "[".$bbcode."=")) === false) {
					break;
				} else if (($open_end = strpos($message, "]", $open)) === false) {
					break;
				} else {
					$param = substr($message, $open + $bblen + 2, $open_end - $open - $bblen - 2);
					if (substr($param, 0, 6) == "&quot;") {
						$param = substr($param, 6);
					}
					if (substr($param, -6) == "&quot;") {
						$param = substr($param, 0, -6);
					}
				}

				if (($close = strpos($message, "[/".$bbcode."]", $open_end + 1)) !== false) {
					$value = substr($message, $open_end + 1, $close - $open_end - 1);
				} else if (strpos($html, "</") !== false) {
					$message = substr($message, 0, $open) . "&#91;" . substr($message, $open + 1);
					continue;
				}

				if (($param == "") && ($value != "")) {
					$param = $value;
				}

				/* Security checks
				 */
				$param = str_replace('"', "&quot;", $param);
				if (strpos(strtolower($param), "javascript:") !== false) {
					$param = "#";
				} else if (substr($param, 0, 5) == "data:") {
					$param = "#";
				}

				/* Replace BBcode with HTML
				 */
				$param_len = strlen($param);
				$value_len = strlen($value);
				$replacement = $html;

				$pos = 0;
				while (($pos = strpos($replacement, '@@', $pos)) !== false) {
					$replacement = substr($replacement, 0, $pos) . $param . substr($replacement, $pos + 2);
					$pos += $param_len;
				}

				$pos = 0;
				while (($pos = strpos($replacement, "##", $pos)) !== false) {
					$replacement = substr($replacement, 0, $pos) . $value . substr($replacement, $pos + 2);
					$pos += $value_len;
				}

				if (($bbcode == "url") && ($param != $value) && $show_url) {
					if (substr($param, 0, 4) == "http") {
						$parts = explode("/", $param, 4);
						$hostname = $parts[2] ?? "";
						$replacement .= " [".$hostname."]";
					}
				}

				$tail_start = ($close !== false) ? $close + $bblen + 3 : $open_end + 1;
				$message = substr($message, 0, $open).$replacement.substr($message, $tail_start);
			} while (--$max_loop > 0);

			return $message;
		}

		/* Translate BBcodes to HTML tags
		 *
		 * INPUT:  -
		 * OUTPUT: string message
		 * ERROR:  -
		 */
		public function translate_bbcodes($show_url = true) {
			/* Load configuration
			 */
			if ($this->bbcodes === null) {
				$this->bbcodes = array();

				foreach (config_file("bbcodes", false) as $line) {
					if ($line[0] == "#") {
						continue;
					}

					$line = str_replace("\t", " ", $line);
					list($bbcode, $html) = explode(" ", $line, 2);
					$html = trim($html);

					$this->bbcodes[$bbcode] = $html;
				}
			}

			/* Translate BBcodes
			 */
			foreach ($this->bbcodes as $bbcode => $html) {
				$this->message = $this->translate_bbcode($bbcode, $html, $this->message, $show_url);
			}

			return $this->message;
		}
	}
?>
