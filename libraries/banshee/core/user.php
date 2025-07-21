<?php
	/* Copyright (c) by Hugo Leisink <hugo@leisink.net>
	 * This file is part of the Banshee PHP framework
	 * https://www.banshee-php.org/
	 *
	 * Licensed under The MIT License
	 */

	namespace Banshee\Core;

	final class user {
		private $db = null;
		private $settings = null;
		private $session = null;
		private $record = array();
		private $logged_in = false;
		private $is_admin = false;
		private $resources_key = "";
		private $max_resources = 0;

		/* Constructor
		 *
		 * INPUT:  object database, object settings, object session
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function __construct($db, $settings, $session) {
			$this->db = $db;
			$this->settings = $settings;
			$this->session = $session;

			/* Basic HTTP Authentication for web services
			 */
			if (isset($_SERVER["HTTP_AUTHORIZATION"])) {
				list($method, $auth) = explode(" ", $_SERVER["HTTP_AUTHORIZATION"], 2);
				if (($method == "Basic") && (($auth = base64_decode($auth)) !== false)) {
					list($username, $password) = explode(":", $auth, 2);
					if ($this->login_password($username, $password) == false) {
						header("Status: 401");
					} else {
						$this->session->bind_to_ip();
					}
				}
			}

			if ($this->session->user_id !== null) {
				$this->load_user_record($this->session->user_id);
			} else{
				$this->record["role_ids"] = array();
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
				case "logged_in": return $this->logged_in;
				case "is_admin": return $this->is_admin;
				case "do_not_track": return $_SERVER["HTTP_DNT"] == 1;
				case "session": return $this->session;
				case "max_resources": return $this->max_resources;
				case "resources_key": return $this->resources_key;
				case "organisation":
					if (($organisation = $this->db->entry("organisations", $this->record["organisation_id"])) !== false) {
						return $organisation["name"];
					}
					break;
				default:
					if (isset($this->record[$key])) {
						return $this->record[$key];
					}
			}

			return null;
		}

		/* Store user information from database in $this->record
		 *
		 * INPUT:  int user identifier
		 * OUTPUT: -
		 * ERROR:  -
		 */
		private function load_user_record($user_id) {
			if (($this->record = $this->db->entry("users", $user_id)) == false) {
				$this->logout();
			} else if ($this->record["status"] == USER_STATUS_DISABLED) {
				$this->logout();
			} else {
				$this->logged_in = true;

				$this->record["role_ids"] = array();
				$query = "select role_id from user_role where user_id=%d";
				if (($roles = $this->db->execute($query, $this->record["id"])) != false) {
					foreach ($roles as $role) {
						array_push($this->record["role_ids"], $role["role_id"]);
						if ((int)$role["role_id"] === (int)ADMIN_ROLE_ID) {
							$this->is_admin = true;
						}
					}
				}

				$query = "select resources_key, max_resources from organisations where id=%d";
				if (($organisations = $this->db->execute($query, $this->record["organisation_id"])) != false) {
					$this->resources_key = $organisations[0]["resources_key"];
					$this->max_resources = $organisations[0]["max_resources"];
				}
			}
		}

		/* Login user
		 *
		 * INPUT:  int user id
		 * OUTPUT: -
		 * ERROR:  -
		 */
		private function login($user_id) {
			$this->session->set_user_id($user_id);
			$this->load_user_record($user_id);
			$this->log_action("user logged-in");

			if (isset($_SESSION["user_switch"]) == false) {
				$query = "update organisations set last_login=%s where id=%d";
				$this->db->query($query, date("Y-m-d H:i:s"), $this->record["organisation_id"]);
			}
		}

		/* Verify user credentials
		 *
		 * INPUT:  string username, string password[, string authenticator code]
		 * OUTPUT: boolean login correct
		 * ERROR:  -
		 */
		public function login_password($username, $password, $code = null) {
			$query = "select * from users where (username=%s or email=%s) and status!=%d limit 1";
			if (($data = $this->db->execute($query, $username, $username, USER_STATUS_DISABLED)) == false) {
				sleep(1);

				return false;
			}
			$user = $data[0];

			if (is_false(USE_AUTHENTICATOR)) {
				$auth_code_ok = true;
			} else if ($user["authenticator_secret"] === null) {
				$auth_code_ok = true;
			} else {
				$authenticator = new \Banshee\authenticator;
				$auth_code_ok = $authenticator->verify_code($user["authenticator_secret"], $code);
			}

			if (strlen($password) <= PASSWORD_MAX_LENGTH) {
				if (password_verify($password, $user["password"]) && $auth_code_ok) {
					$this->login((int)$user["id"]);
				}
			}

			if ($this->logged_in == false) {
				sleep(1);
			}

			return $this->logged_in;
		}

		/* Verify one time key
		 *
		 * INPUT:  string one time key
		 * OUTPUT: boolean key valid
		 * ERROR:  -
		 */
		public function login_one_time_key($key) {
			if (strlen($key) != ONE_TIME_KEY_SIZE) {
				return false;
			}

			list($user_id, $secret) = explode("x", $key, 2);

			$query = "select * from users where id=%d and one_time_key!=%s and status!=%d limit 1";
			if (($data = $this->db->execute($query, $user_id, "", USER_STATUS_DISABLED)) != false) {
				$user = $data[0];
				if (hash_equals($user["one_time_key"], $key)) {
					$query = "update users set one_time_key=null where id=%d";
					$this->db->query($query, $user["id"]);

					$this->login((int)$user["id"]);
					$this->session->bind_to_ip();
				}
			}

			if ($this->logged_in == false) {
				sleep(1);
			}

			return $this->logged_in;
		}

		/* Login via SSL client authentication
		 *
		 * INPUT:  int certificate serial number
		 * OUTPUT: boolean serial number valid
		 * ERROR:  -
		 */
		public function login_ssl_auth($cert_serial) {
			$query = "select * from users where cert_serial=%d and status!=%d limit 1";
			if (($data = $this->db->execute($query, $cert_serial, USER_STATUS_DISABLED)) == false) {
				return false;
			}
			$user = $data[0];

			$this->login((int)$user["id"]);

			return true;
		}

		/* Logout current user
		 *
		 * INPUT:  -
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function logout() {
			$this->log_action("user logged-out");

			$this->session->reset();

			$this->logged_in = false;
			$this->record = array();
			$this->is_admin = false;
		}

		/* Checks if user has access to page
		 *
		 * INPUT:  string page identifier
		 * OUTPUT: boolean user has access to page
		 * ERROR:  -
		 */
		public function access_allowed($page) {
			static $access = array();

			/* Always access
			 */
			$allowed = array(LOGOUT_MODULE);
			if ($this->is_admin || in_array($page, $allowed)) {
				return true;
			}

			/* Public module
			 */
			if (in_array($page, page_to_module(config_file("public_modules")))) {
				return true;
			}

			/* Public page in database
			*/
			$query = "select count(*) as count from pages where url=%s and private=%d";
			if (($result = $this->db->execute($query, "/".$page, NO)) == false) {
				return false;
			} else if ($result[0]["count"] > 0) {
				return true;
			}

			/* No roles, no access
			 */
			if (is_array($this->record["role_ids"] ?? null) == false) {
				return false;
			} else if (count($this->record["role_ids"]) == 0) {
				return false;
			}

			/* Cached?
			 */
			if (isset($access[$page])) {
				return $access[$page];
			}

			/* Check access
			 */
			$conditions = $rids = array();
			foreach ($this->record["role_ids"] as $rid) {
				array_push($conditions, "%d");
				array_push($rids, $rid);
			}

			if (in_array($page, page_to_module(config_file("private_modules")))) {
				/* Pages on disk (modules)
				 */
				$query = "select %S from roles where id in (".implode(", ", $conditions).")";
				if (($access = $this->db->execute($query, $page, $rids)) == false) {
					return false;
				}
			} else {
				/* Pages in database
				 */
				$query = "select a.level from page_access a, pages p ".
				         "where a.page_id=p.id and p.url=%s and a.level>0 ".
				         "and a.role_id in (".implode(", ", $conditions).")";
				if (($access = $this->db->execute($query, "/".$page, $rids)) == false) {
					return false;
				}
			}

			$access[$page] = max(array_flatten($access)) > 0;

			return $access[$page];
		}

		/* Verify if user has a certain role
		 *
		 * INPUT:  int role identifier / string role name
		 * OUTPUT: boolean user has role
		 * ERROR:  -
		 */
		public function has_role($role) {
			if (is_int($role)) {
				return in_array($role, $this->record["role_ids"]);
			} else if (is_string($role)) {
				if (($entry = $this->db->entry("roles", $role, "name")) != false) {
					return $this->has_role((int)$entry["id"]);
				}
			} else if (is_array($role)) {
				foreach ($role as $item) {
					if ($this->has_role($item)) {
						return true;
					}
				}
			}

			return false;
		}

		/* Log user action
		 *
		 * INPUT:  string action / format[, mixed arg, ...]
		 * OUTPUT: -
		 * ERROR:  -
		 */
		public function log_action() {
			static $logfile = null;

			if ($logfile === null) {
				$logfile = new \Banshee\logfile("actions");
			}

			if ($this->logged_in == false) {
				$logfile->user_id = "-";
			} else if (isset($_SESSION["user_switch"]) == false) {
				$logfile->user_id = $this->id;
			} else {
				$logfile->user_id = $_SESSION["user_switch"].":".$this->id;
			}

			$arguments = func_get_args();
			call_user_func_array(array($logfile, "add_entry"), $arguments);
		}
	}
?>
