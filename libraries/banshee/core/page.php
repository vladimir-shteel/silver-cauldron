<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee\Core;

	final class page {
		private $db = null;
		private $settings = null;
		private $user = null;
		private $module = null;
		private $url = "";
		private $page = null;
		private $type = "";
		private $http_code = 200;
		private $is_public = true;
		private $pathinfo = array();
		private $parameters = array();
		private $ajax_request = false;

		/* Constructor
		 *
		 * INPUT:  object database, object settings, object user
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($db, $settings, $user) {
			$this->db = $db;
			$this->settings = $settings;
			$this->user = $user;

			/* AJAX request
			 */
			if ((($_SERVER["HTTP_X_REQUESTED_WITH"] ?? null) == "XMLHttpRequest") || (($_GET["output"] ?? null) == "ajax")) {
				$this->ajax_request = true;
			}

			/* Select module
			 */
			if ($this->user->session->denied) {
				$this->module = ERROR_MODULE;
				$this->http_code = 403;
			} else if (is_true(ENFORCE_HTTPS) && ($_SERVER["HTTPS"] != "on")) {
				header(sprintf("Location: https://%s%s", $_SERVER["HTTP_HOST"], $_SERVER["REQUEST_URI"]));
				header("Strict-Transport-Security: max-age=31536000");
				$this->module = ERROR_MODULE;
				$this->http_code = 301;
			} else if (is_false(WEBSITE_ONLINE) && ($_SERVER["REMOTE_ADDR"] != WEBSITE_ONLINE)) {
				$this->module = "banshee/offline";
			} else if (($this->db->connected == false) || $this->user->session->error) {
				if (module_exists("setup") && is_true(DEBUG_MODE)) {
					$this->module = "setup";
				} else {
					$this->module = ERROR_MODULE;
					$this->http_code = 500;
				}
			} else {
				list($this->url) = explode("?", $_SERVER["REQUEST_URI"], 2);

				/* Rerouting
				 */
				$query = "select replacement, type from reroute where original=%s";
				if (($result = $this->db->execute($query, $this->url)) != false) {
					$reroute = $result[0];
					switch ($reroute["type"]) {
						case 0:
							$this->url = $reroute["replacement"];
							break;
						case 1:
							header("Location: ".$reroute["replacement"]);
							$this->module = ERROR_MODULE;
							$this->http_code = 301;
							break;
						case 2:
							header("Location: ".$reroute["replacement"]);
							$this->module = ERROR_MODULE;
							$this->http_code = 307;
							break;
					}
				}

				$path = $this->url;
				if (substr($path, 0, 1) == "/") {
					$path = substr($path, 1);
				}
				$path = rtrim($path, "/");

				if ($path == "") {
					if ($this->user->logged_in == false) {
						$page = $this->settings->start_page;
					} else {
						$page = $this->settings->page_after_login;
					}
				} else if (valid_input($path, VALIDATE_URL, VALIDATE_NONEMPTY)) {
					$page = $path;
				} else {
					$this->module = ERROR_MODULE;
					$this->http_code = 404;
				}

				if (isset($page)) {
					$this->pathinfo = explode("/", $page);
				}
			}

			if ($this->module === null) {
				$this->select_module($page);
			}
		}

		/* Destructor
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __destruct() {
			$_SESSION["last_visit"] = time();

			if ($this->ajax_request == false) {
				$this_page = trim($this->url, "/");
				if (is_array($_SESSION["previous_pages"] ?? null) == false) {
					$_SESSION["previous_pages"] = array(null, $this_page);
				} else if ($_SESSION["previous_pages"][1] != $this_page) {
					$_SESSION["previous_pages"][0] = $_SESSION["previous_pages"][1];
					$_SESSION["previous_pages"][1] = $this_page;
				}
			}
		}

		/* Magic method get
		 *
		 * INPUT:  string key
		 * OUTPUT: mixed value
		 * ERROR:  null
		 */
		public function __get($key) {
			switch ($key) {
				case "module": return $this->module;
				case "previous":
					if (is_array($_SESSION["previous_pages"] ?? null) == false) {
						return null;
					} else if ($_SESSION["previous_pages"][1] != ltrim($this->url, "/")) {
						return $_SESSION["previous_pages"][1];
					} else {
						return $_SESSION["previous_pages"][0];
					}
				case "url": return $this->url;
				case "page": return $this->page !== null ? $this->page : $this->module;
				case "type": return ltrim($this->type, ".");
				case "view": return $this->module.$this->type;
				case "pathinfo": return $this->pathinfo;
				case "parameters": return $this->parameters;
				case "http_code": return $this->http_code;
				case "ajax_request": return $this->ajax_request;
				case "is_public": return $this->is_public;
				case "is_private": return $this->is_public == false;
			}

			return null;
		}

		/* Set HTTP return code
		 *
		 * INPUT:  int HTTP code
		 * OUTPUT: -
		 * ERROR;  -
		 */
		public function set_http_code($code) {
			$this->http_code = $code;
		}

		/* Module available on disk
		 *
		 * INPUT:  string URL, string page configuration file
		 * OUTPUT: string module identifier
		 * ERROR:  null
		 */
		public function module_on_disk($url, $pages) {
			$module = null;
			$url_parts = explode("/", $url);

			foreach ($pages as $line) {
				$page_parts = explode("/", $line);
				$page_count = count($page_parts);
				$match = true;

				for ($i = 0; $i < $page_count; $i++) {
					if ($page_parts[$i] !== ($url_parts[$i] ?? null)) {
						$match = false;
						break;
					}
				}

				if ($match && (strlen($line) >= strlen($module ?? ""))) {
					$module = page_to_module($line);
					$this->type = page_to_type($line);
				}
			}

			return $module;
		}

		/* Page available in database
		 *
		 * INPUT:  string page, int private page
		 * OUTPUT: string module identifier
		 * ERROR:  null
		 */
		private function page_in_database($page, $private) {
			$query = "select id,visible from pages where url=%s and private=%d limit 1";
			if (($result = $this->db->execute($query, "/".$page, $private)) == false) {
				return null;
			}

			if ($result[0]["visible"] == NO) {
				if ($this->user->access_allowed("vault/page") == false) {
					return null;
				}
			}
			$this->url = "/".$page;
			$this->page = $page;

			return PAGE_MODULE;
		}

		/* Check parameter has value
		 *
		 * INPUT:  int parameter number
		 * OUTPUT: boolean match
		 * ERROR:  -
		 */
		public function parameter_value($number, $value = null) {
			if (empty($this->parameters[$number])) {
				return false;
			}

			if ($value == null) {
				return true;
			}

			return $this->parameters[$number] == $value;
		}

		/* Check parameter contains a numeric value
		 *
		 * INPUT:  int parameter number
		 * OUTPUT: boolean result
		 * ERROR:  -
		 */
		public function parameter_numeric($number) {
			if (isset($this->parameters[$number]) == false) {
				return false;
			}

			return valid_input($this->parameters[$number], VALIDATE_NUMBERS, VALIDATE_NONEMPTY);
		}

		/* Determine what module needs te be loaded based on requested page
		 *
		 * INPUT:  string page identifier
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function select_module($page) {
			if (($this->module !== null) && ($this->module !== LOGIN_MODULE)) {
				return;
			}

			if (($public_module = $this->module_on_disk($page, config_file("public_modules"))) !== null) {
				$public_count = substr_count($public_module, "/") + 1;
			} else if (($public_module = $this->page_in_database($page, NO)) !== null) {
				$public_count = substr_count($page, "/") + 1;
			} else {
				$public_count = 0;
			}

			if (($private_module = $this->module_on_disk($page, config_file("private_modules"))) !== null) {
				$private_count = substr_count($private_module, "/") + 1;
			} else if (($private_module = $this->page_in_database($page, YES)) !== null) {
				$private_count = substr_count($page, "/") + 1;
			} else {
				$private_count = 0;
			}

			if (($public_module == null) && ($private_module == null)) {
				/* Page does not exist
				 */
				$this->module = ERROR_MODULE;
				$this->http_code = 404;
				$this->type = "";
				return;
			}

			if ($public_count >= $private_count) {
				/* Page is public
				 */
				$this->module = $public_module;
				$this->parameters = array_slice($this->pathinfo, $public_count);
				return;
			}

			/* Page is private
			 */
			$this->module = $private_module;
			$this->parameters = array_slice($this->pathinfo, $private_count);

			if ($this->user->logged_in == false) {
				/* User not logged in
				 */
				$this->module = LOGIN_MODULE;
				$this->type = "";
			} else if ($this->user->access_allowed($this->__get("page").$this->type) == false) {
				/* Access denied because right role is missing
				 */
				$this->module = ERROR_MODULE;
				$this->http_code = 403;
				$this->type = "";
				$this->user->log_action("unauthorized request for page %s", $page);
			} else if (($this->module != LOGOUT_MODULE) && ($this->user->status == USER_STATUS_CHANGEPWD) && (isset($_SESSION["user_switch"]) == false)) {
				/* Change account before access to private pages
				 */
				$this->module = ACCOUNT_MODULE;
				$this->type = "";
			} else {
				/* Access allowed
				 */
				$this->is_public = false;
				$_SESSION["last_private_visit"] = time();
			}
		}
	}
?>
